use crate::error::AppError;
use crate::state::AppState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct Hit {
    pub id: i64,
    pub group_id: Option<i64>,
    pub title: Option<String>,
    pub snippet: String,
}

#[tauri::command]
pub async fn search_query(state: State<'_, AppState>, q: String) -> Result<Vec<Hit>, AppError> {
    let conn = state.pool.get()?;
    let pattern = format!("%{}%", q.replace('"', ""));
    let mut stmt = conn.prepare(
        "SELECT n.id, n.group_id, n.title, substr(n.content_md, 1, 200)
         FROM note n WHERE n.is_trashed=0 AND (n.content_md LIKE ?1 OR n.title LIKE ?1)
         ORDER BY n.updated_at DESC LIMIT 50",
    )?;
    let rows = stmt.query_map([&pattern], |r| {
        Ok(Hit {
            id: r.get(0)?,
            group_id: r.get(1)?,
            title: r.get(2)?,
            snippet: r.get(3)?,
        })
    })?;
    Ok(rows.collect::<Result<Vec<_>, _>>()?)
}
