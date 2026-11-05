use super::query_parser::{parse_query, ParseError, Term};
use crate::error::AppError;
use crate::infra::db::Pool;
use crate::state::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize, Debug, Clone)]
pub struct Hit {
    pub id: i64,
    pub group_id: Option<i64>,
    pub title: Option<String>,
    pub snippet: String,
    /// Positive query terms, returned so the client can highlight them.
    pub terms: Vec<String>,
    pub score: i64,
}

const SNIPPET_WINDOW: usize = 140;

/// Build a context snippet around the earliest occurrence of any keyword.
fn make_snippet(content: &str, terms: &[String]) -> String {
    let text = content.replace(['\n', '\r', '\t'], " ");
    let lower = text.to_lowercase();
    let mut best: Option<usize> = None;
    for term in terms {
        let term = term.to_lowercase();
        if term.is_empty() {
            continue;
        }
        if let Some(pos) = lower.find(&term) {
            best = Some(match best {
                Some(existing) if existing <= pos => existing,
                _ => pos,
            });
        }
    }
    let Some(pos) = best else {
        return text.chars().take(SNIPPET_WINDOW).collect();
    };
    let char_start = text[..pos].chars().count();
    let char_count = text[pos..].chars().count();
    let start_char = char_start.saturating_sub(30);
    let end_char = (start_char + SNIPPET_WINDOW).min(char_start + char_count);
    let mut out: String = text
        .chars()
        .skip(start_char)
        .take(end_char - start_char)
        .collect();
    if start_char > 0 {
        out.insert_str(0, "…");
    }
    if end_char < char_start + char_count {
        out.push('…');
    }
    out
}

/// Escape a term for use inside a LIKE pattern with `ESCAPE '\'`.
fn escape_like(text: &str) -> String {
    text.replace('\\', "\\\\")
        .replace('%', "\\%")
        .replace('_', "\\_")
}

/// LIKE pattern for one term: prefix terms anchor at the start of the text,
/// all other terms match anywhere (substring, required for CJK).
fn like_pattern(term: &Term) -> String {
    if term.prefix {
        format!("{}%", escape_like(&term.text))
    } else {
        format!("%{}%", escape_like(&term.text))
    }
}

fn tag_exists_clause(tag_idx: usize) -> String {
    format!(
        "EXISTS (SELECT 1 FROM note_tag nt JOIN tag t2 ON t2.id = nt.tag_id \
         WHERE nt.note_id = n.id AND t2.name = ?{tag_idx} COLLATE NOCASE)"
    )
}

/// Full-text search over notes with a light query syntax
/// (see `query_parser`): `"quoted phrases"`, `prefix*`, `-excluded` terms,
/// `tag:name` filters and a `group:name` filter. Plain words keep the
/// historical behavior: substring AND, title hit 3× against body hit 1×.
///
/// Hidden-content notes and (unless `include_archived`) archived notes are
/// excluded. The `tag` argument (palette dropdown) ANDs with any `tag:`
/// filters from the query. A query made only of filters/exclusions is valid
/// and ranks by recency. Unbalanced quotes surface as
/// [`AppError::QuerySyntax`] so the UI can show a readable message.
pub fn search_notes(
    pool: &Pool,
    q: &str,
    tag: Option<&str>,
    include_archived: bool,
) -> Result<Vec<Hit>, AppError> {
    let parsed = match parse_query(q) {
        Ok(parsed) => parsed,
        Err(ParseError::Empty) => return Ok(Vec::new()),
        Err(err) => return Err(AppError::from(err)),
    };

    let mut params: Vec<String> = Vec::new();
    let mut conditions: Vec<String> = Vec::new();
    let mut score_terms: Vec<String> = Vec::new();

    for term in &parsed.includes {
        let pattern = like_pattern(term);
        let title_idx = params.len() + 1;
        params.push(pattern.clone());
        let body_idx = params.len() + 1;
        params.push(pattern);
        conditions.push(format!(
            "(n.title LIKE ?{title_idx} ESCAPE '\\' OR n.content_md LIKE ?{body_idx} ESCAPE '\\')"
        ));
        score_terms.push(format!(
            "(CASE WHEN n.title LIKE ?{title_idx} ESCAPE '\\' THEN 3 ELSE 0 END + \
             CASE WHEN n.content_md LIKE ?{body_idx} ESCAPE '\\' THEN 1 ELSE 0 END)"
        ));
    }

    for term in &parsed.excludes {
        let pattern = like_pattern(term);
        let title_idx = params.len() + 1;
        params.push(pattern.clone());
        let body_idx = params.len() + 1;
        params.push(pattern);
        conditions.push(format!(
            "NOT (n.title LIKE ?{title_idx} ESCAPE '\\' OR n.content_md LIKE ?{body_idx} ESCAPE '\\')"
        ));
    }

    for tag_name in &parsed.tags {
        let tag_idx = params.len() + 1;
        params.push(tag_name.clone());
        conditions.push(tag_exists_clause(tag_idx));
    }

    if let Some(tag_name) = tag {
        let tag_idx = params.len() + 1;
        params.push(tag_name.to_string());
        conditions.push(tag_exists_clause(tag_idx));
    }

    if let Some(group_name) = &parsed.group {
        let group_idx = params.len() + 1;
        params.push(group_name.clone());
        conditions.push(format!(
            "n.group_id = (SELECT id FROM \"group\" WHERE name = ?{group_idx} COLLATE NOCASE)"
        ));
    }

    if conditions.is_empty() {
        return Ok(Vec::new());
    }

    let score = if score_terms.is_empty() {
        "0".to_string()
    } else {
        score_terms.join(" + ")
    };

    let archived_clause = if include_archived {
        ""
    } else {
        " AND n.is_archived = 0"
    };
    let sql = format!(
        "SELECT n.id, n.group_id, n.title, n.content_md, ({score}) AS score
         FROM note n
         WHERE n.is_trashed = 0
           AND n.is_content_hidden = 0
           {archived_clause}
           AND ({where_cond})
         ORDER BY score DESC, n.updated_at DESC, n.id ASC
         LIMIT 50",
        score = score,
        where_cond = conditions.join(" AND "),
    );

    let highlight_terms = parsed.highlight_terms();
    let conn = pool.get()?;
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(Hit {
                id: row.get(0)?,
                group_id: row.get(1)?,
                title: row.get(2)?,
                snippet: make_snippet(&row.get::<_, String>(3)?, &highlight_terms),
                terms: highlight_terms.clone(),
                score: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(rows)
}

#[tauri::command]
pub async fn search_query(
    state: State<'_, AppState>,
    q: String,
    tag: Option<String>,
    include_archived: Option<bool>,
) -> Result<Vec<Hit>, AppError> {
    search_notes(
        &state.pool,
        &q,
        tag.as_deref(),
        include_archived.unwrap_or(false),
    )
}
