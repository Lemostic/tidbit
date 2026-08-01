use crate::data_directory::DataDirectory;
use crate::domain::attachment::attachment_protocol_url;
use crate::domain::Attachment;
use crate::error::AppError;
use crate::state::AppState;
use tauri::State;

const MAX_IMAGE_BYTES: usize = 20 * 1024 * 1024;

#[tauri::command]
pub async fn attachments_save(
    state: State<'_, AppState>,
    data_dir: State<'_, DataDirectory>,
    note_id: i64,
    file_name: String,
    mime: String,
    data: Vec<u8>,
) -> Result<Attachment, AppError> {
    state.notes.get(note_id)?;
    let ext = match mime.as_str() {
        "image/png" => "png",
        "image/jpeg" => "jpg",
        "image/gif" => "gif",
        "image/webp" => "webp",
        "image/bmp" => "bmp",
        _ => return Err(AppError::Migration("unsupported_image_type".into())),
    };
    if data.is_empty() || data.len() > MAX_IMAGE_BYTES {
        return Err(AppError::Migration("invalid_image_size".into()));
    }
    let stored_name = format!("{}.{}", uuid::Uuid::new_v4(), ext);
    let directory = data_dir.0.join("attachments").join(note_id.to_string());
    std::fs::create_dir_all(&directory)?;
    std::fs::write(directory.join(&stored_name), &data)?;
    let url = attachment_protocol_url(note_id, &stored_name);
    state.attachments.create(
        note_id,
        file_name.trim(),
        &mime,
        data.len() as i64,
        &stored_name,
        &url,
    )
}
