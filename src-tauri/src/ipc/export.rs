use crate::error::AppError;
use crate::export::{self, ExportRequest, ExportResult};
use crate::state::AppState;
use chrono::Local;
use tauri::State;

#[tauri::command]
pub async fn notes_export(
    state: State<'_, AppState>,
    request: ExportRequest,
) -> Result<Option<ExportResult>, AppError> {
    let groups = state.groups.list()?;
    let mut notes = state.notes.list_by_group(None, true)?;
    for note in &mut notes {
        note.tags = state.tags.tags_for_note(note.id)?;
        note.reminder = state.reminders.get(note.id)?;
    }
    let document = export::build_document(&request, &groups, notes)?;
    let extension = match &request.format {
        export::ExportFormat::Markdown => "md",
        export::ExportFormat::Pdf => "pdf",
    };
    let suggested = format!(
        "{}-{}.{}",
        safe_filename(&document.title),
        Local::now().format("%Y-%m-%d"),
        extension,
    );
    let Some(path) = tokio::task::spawn_blocking({
        let format = request.format.clone();
        move || export::choose_save_path(&format, &suggested)
    })
    .await
    .map_err(|error| AppError::Migration(error.to_string()))??
    else {
        return Ok(None);
    };

    let note_count = document.note_count();
    tokio::task::spawn_blocking({
        let format = request.format.clone();
        let path = path.clone();
        move || export::export_to_path(&document, &format, &path)
    })
    .await
    .map_err(|error| AppError::Migration(error.to_string()))??;

    Ok(Some(ExportResult {
        path: path.to_string_lossy().into_owned(),
        note_count,
    }))
}

fn safe_filename(value: &str) -> String {
    let cleaned = value
        .chars()
        .map(|character| {
            if r#"<>:"/\|?*"#.contains(character) {
                '_'
            } else {
                character
            }
        })
        .collect::<String>();
    let cleaned = cleaned.trim().trim_end_matches('.').trim();
    if cleaned.is_empty() {
        "tidbit-export".into()
    } else {
        cleaned.into()
    }
}

#[cfg(test)]
mod tests {
    use super::safe_filename;

    #[test]
    fn sanitizes_windows_export_filenames() {
        assert_eq!(safe_filename("工作:计划/周报"), "工作_计划_周报");
        assert_eq!(safe_filename("..."), "tidbit-export");
    }
}
