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
    /// Original query keywords, returned so the client can highlight them.
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
    let mut out: String = text.chars().skip(start_char).take(end_char - start_char).collect();
    if start_char > 0 {
        out.insert_str(0, "…");
    }
    if end_char < char_start + char_count {
        out.push('…');
    }
    out
}

/// Full-text search over notes.
///
/// Each whitespace-separated keyword must match the title OR the body
/// (AND semantics). Ranking weights a title hit 3× against a body hit 1×.
/// Hidden-content notes and (unless `include_archived`) archived notes are
/// excluded. When `tag` is given only notes carrying that tag are returned.
pub fn search_notes(
    pool: &Pool,
    q: &str,
    tag: Option<&str>,
    include_archived: bool,
) -> Result<Vec<Hit>, AppError> {
    let keywords: Vec<String> = q
        .split_whitespace()
        .map(|k| k.trim())
        .filter(|k| !k.is_empty())
        .map(|k| k.to_string())
        .collect();
    if keywords.is_empty() {
        return Ok(Vec::new());
    }

    let mut params: Vec<String> = Vec::new();
    let mut conditions: Vec<String> = Vec::new();
    let mut score_terms: Vec<String> = Vec::new();
    for kw in &keywords {
        let pattern = format!("%{}%", kw.replace('%', "\\%").replace('_', "\\_"));
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

    let archived_clause = if include_archived { "" } else { " AND n.is_archived = 0" };
    let tag_clause = match tag {
        Some(tag_name) => {
            let tag_idx = params.len() + 1;
            params.push(tag_name.to_string());
            format!(
                " AND EXISTS (SELECT 1 FROM note_tag nt JOIN tag t2 ON t2.id = nt.tag_id \
                 WHERE nt.note_id = n.id AND t2.name = ?{tag_idx} COLLATE NOCASE)"
            )
        }
        None => String::new(),
    };

    let sql = format!(
        "SELECT n.id, n.group_id, n.title, n.content_md, ({score}) AS score
         FROM note n
         WHERE n.is_trashed = 0
           AND n.is_content_hidden = 0
           {archived_clause}
           AND ({where_cond})
           {tag_clause}
         ORDER BY score DESC, n.updated_at DESC, n.id ASC
         LIMIT 50",
        score = score_terms.join(" + "),
        where_cond = conditions.join(" AND "),
    );

    let conn = pool.get()?;
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt
        .query_map(rusqlite::params_from_iter(params.iter()), |row| {
            Ok(Hit {
                id: row.get(0)?,
                group_id: row.get(1)?,
                title: row.get(2)?,
                snippet: make_snippet(&row.get::<_, String>(3)?, &keywords),
                terms: keywords.clone(),
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
    search_notes(&state.pool, &q, tag.as_deref(), include_archived.unwrap_or(false))
}
