use crate::domain::{Group, Note};
use crate::error::AppError;
use chrono::{Local, TimeZone};
use genpdf::{elements, fonts, style, Element as _, Margins};
use serde::Deserialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub scope: ExportScope,
    pub group_id: Option<i64>,
    pub format: ExportFormat,
    pub include_metadata: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportScope {
    All,
    Group,
    Ungrouped,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Markdown,
    Pdf,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub path: String,
    pub note_count: usize,
}

#[derive(Debug, Clone)]
pub struct ExportGroup {
    pub name: String,
    pub notes: Vec<Note>,
}

#[derive(Debug, Clone)]
pub struct ExportDocument {
    pub title: String,
    pub groups: Vec<ExportGroup>,
    pub note_level: usize,
    pub include_metadata: bool,
}

impl ExportDocument {
    pub fn note_count(&self) -> usize {
        self.groups.iter().map(|group| group.notes.len()).sum()
    }
}

pub fn build_document(
    request: &ExportRequest,
    groups: &[Group],
    notes: Vec<Note>,
) -> Result<ExportDocument, AppError> {
    match request.scope {
        ExportScope::All => {
            let mut output = groups
                .iter()
                .map(|group| ExportGroup {
                    name: clean_heading(&group.name, "未命名分组"),
                    notes: notes
                        .iter()
                        .filter(|note| note.group_id == Some(group.id))
                        .cloned()
                        .collect(),
                })
                .collect::<Vec<_>>();
            let ungrouped = notes
                .iter()
                .filter(|note| note.group_id.is_none())
                .cloned()
                .collect::<Vec<_>>();
            if !ungrouped.is_empty() || output.is_empty() {
                output.push(ExportGroup {
                    name: "未分组".into(),
                    notes: ungrouped,
                });
            }
            Ok(ExportDocument {
                title: "tidbit 便签导出".into(),
                groups: output,
                note_level: 3,
                include_metadata: request.include_metadata,
            })
        }
        ExportScope::Group => {
            let group_id = request
                .group_id
                .ok_or_else(|| AppError::Migration("missing group id".into()))?;
            let group = groups
                .iter()
                .find(|group| group.id == group_id)
                .ok_or(AppError::NotFound)?;
            Ok(ExportDocument {
                title: clean_heading(&group.name, "未命名分组"),
                groups: vec![ExportGroup {
                    name: clean_heading(&group.name, "未命名分组"),
                    notes: notes
                        .into_iter()
                        .filter(|note| note.group_id == Some(group_id))
                        .collect(),
                }],
                note_level: 2,
                include_metadata: request.include_metadata,
            })
        }
        ExportScope::Ungrouped => Ok(ExportDocument {
            title: "未分组便签".into(),
            groups: vec![ExportGroup {
                name: "未分组".into(),
                notes: notes
                    .into_iter()
                    .filter(|note| note.group_id.is_none())
                    .collect(),
            }],
            note_level: 2,
            include_metadata: request.include_metadata,
        }),
    }
}

pub fn render_markdown(document: &ExportDocument, exported_at: i64) -> String {
    let mut output = String::new();
    output.push_str(&format!("# {}\n\n", document.title));
    output.push_str(&format!(
        "> 导出时间：{}\n> 便签数量：{}\n\n",
        format_timestamp(exported_at),
        document.note_count()
    ));

    for group in &document.groups {
        if document.note_level == 3 {
            output.push_str(&format!("## {}\n\n", group.name));
        }
        if group.notes.is_empty() {
            output.push_str("_暂无便签。_\n\n");
            continue;
        }
        for note in &group.notes {
            output.push_str(&format!(
                "{} {}\n\n",
                "#".repeat(document.note_level),
                clean_heading(note.title.as_deref().unwrap_or("无标题"), "无标题")
            ));
            if document.include_metadata {
                output.push_str(&metadata_markdown(note));
                output.push('\n');
            }
            let content = note.content_md.trim();
            if content.is_empty() {
                output.push_str("_暂无正文。_\n\n");
            } else {
                output.push_str(&shift_markdown_headings(content, document.note_level));
                output.push_str("\n\n");
            }
        }
    }
    output
}

pub fn render_pdf(
    document: &ExportDocument,
    exported_at: i64,
    output: &Path,
) -> Result<(), AppError> {
    let family = load_pdf_font_family()?;
    let mut pdf = genpdf::Document::new(family);
    pdf.set_title(&document.title);
    pdf.set_minimal_conformance();
    pdf.set_line_spacing(1.15);
    let mut decorator = genpdf::SimplePageDecorator::new();
    decorator.set_margins(Margins::vh(16, 18));
    pdf.set_page_decorator(decorator);

    pdf.push(
        elements::Paragraph::new(document.title.clone())
            .styled(style::Style::new().bold().with_font_size(22)),
    );
    pdf.push(
        elements::Paragraph::new(format!(
            "导出时间：{} · 便签数量：{}",
            format_timestamp(exported_at),
            document.note_count()
        ))
        .styled(
            style::Style::new()
                .with_font_size(9)
                .with_color(style::Color::Rgb(92, 105, 116)),
        ),
    );
    pdf.push(elements::Break::new(1.0));

    for group in &document.groups {
        if document.note_level == 3 {
            pdf.push(
                elements::Paragraph::new(group.name.clone())
                    .styled(style::Style::new().bold().with_font_size(16)),
            );
            pdf.push(elements::Break::new(0.35));
        }
        if group.notes.is_empty() {
            pdf.push(elements::Paragraph::new("暂无便签。"));
            pdf.push(elements::Break::new(0.7));
            continue;
        }
        for note in &group.notes {
            pdf.push(
                elements::Paragraph::new(clean_heading(
                    note.title.as_deref().unwrap_or("无标题"),
                    "无标题",
                ))
                .styled(
                    style::Style::new()
                        .bold()
                        .with_font_size(if document.note_level == 2 { 16 } else { 14 }),
                ),
            );
            if document.include_metadata {
                pdf.push(
                    elements::Paragraph::new(metadata_plain(note)).styled(
                        style::Style::new()
                            .with_font_size(9)
                            .with_color(style::Color::Rgb(92, 105, 116)),
                    ),
                );
            }
            for line in markdown_pdf_lines(&note.content_md) {
                let (text, size, bold) = line;
                if text.is_empty() {
                    pdf.push(elements::Break::new(0.35));
                } else if bold {
                    pdf.push(
                        elements::Paragraph::new(text)
                            .styled(style::Style::new().bold().with_font_size(size)),
                    );
                } else {
                    pdf.push(
                        elements::Paragraph::new(text)
                            .styled(style::Style::new().with_font_size(size)),
                    );
                }
            }
            pdf.push(elements::Break::new(0.8));
        }
    }
    pdf.render_to_file(output)
        .map_err(|error| AppError::Migration(error.to_string()))
}

pub fn export_to_path(
    document: &ExportDocument,
    format: &ExportFormat,
    path: &Path,
) -> Result<(), AppError> {
    let exported_at = Local::now().timestamp_millis();
    match format {
        ExportFormat::Markdown => {
            fs::write(path, render_markdown(document, exported_at)).map_err(AppError::from)
        }
        ExportFormat::Pdf => render_pdf(document, exported_at, path),
    }
}

pub fn choose_save_path(
    format: &ExportFormat,
    suggested_name: &str,
) -> Result<Option<PathBuf>, AppError> {
    #[cfg(target_os = "windows")]
    {
        let (filter, extension) = match format {
            ExportFormat::Markdown => ("Markdown 文件 (*.md)|*.md", "md"),
            ExportFormat::Pdf => ("PDF 文件 (*.pdf)|*.pdf", "pdf"),
        };
        let script = r#"Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.SaveFileDialog; $d.Filter=$env:TIDBIT_EXPORT_FILTER; $d.DefaultExt=$env:TIDBIT_EXPORT_EXT; $d.AddExtension=$true; $d.FileName=$env:TIDBIT_EXPORT_NAME; if($d.ShowDialog() -eq 'OK'){[Console]::OutputEncoding=[Text.Encoding]::UTF8; Write-Output $d.FileName}"#;
        let output = Command::new("powershell")
            .args(["-NoProfile", "-STA", "-Command", script])
            .env("TIDBIT_EXPORT_FILTER", filter)
            .env("TIDBIT_EXPORT_EXT", extension)
            .env("TIDBIT_EXPORT_NAME", suggested_name)
            .output()?;
        if !output.status.success() {
            return Ok(None);
        }
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Ok((!path.is_empty()).then_some(PathBuf::from(path)));
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (format, suggested_name);
        Ok(None)
    }
}

fn metadata_markdown(note: &Note) -> String {
    format!(
        "> 创建时间：{}\n> 更新时间：{}\n> 状态：{}{}{}\n> 隐私内容：{}\n> 字数：{}\n",
        format_timestamp(note.created_at),
        format_timestamp(note.updated_at),
        if note.is_archived {
            "已归档"
        } else {
            "正常"
        },
        if note.is_pinned { " · 已置顶" } else { "" },
        if note.is_trashed { " · 回收站" } else { "" },
        if note.is_content_hidden { "是" } else { "否" },
        note.word_count,
    )
}

fn metadata_plain(note: &Note) -> String {
    format!(
        "创建：{} · 更新：{} · 状态：{}{}{} · 隐私内容：{} · 字数：{}",
        format_timestamp(note.created_at),
        format_timestamp(note.updated_at),
        if note.is_archived {
            "已归档"
        } else {
            "正常"
        },
        if note.is_pinned { " · 已置顶" } else { "" },
        if note.is_trashed { " · 回收站" } else { "" },
        if note.is_content_hidden { "是" } else { "否" },
        note.word_count,
    )
}

fn format_timestamp(timestamp: i64) -> String {
    Local
        .timestamp_millis_opt(timestamp)
        .single()
        .map(|value| value.format("%Y-%m-%d %H:%M").to_string())
        .unwrap_or_else(|| "未知".into())
}

fn clean_heading(value: &str, fallback: &str) -> String {
    let cleaned = value.replace(['\r', '\n'], " ").trim().to_string();
    if cleaned.is_empty() {
        fallback.into()
    } else {
        cleaned
    }
}

pub fn shift_markdown_headings(markdown: &str, note_level: usize) -> String {
    let mut in_fence = false;
    markdown
        .lines()
        .map(|line| {
            let trimmed = line.trim_start();
            if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
                in_fence = !in_fence;
                return line.to_string();
            }
            if in_fence {
                return line.to_string();
            }
            let hashes = trimmed
                .chars()
                .take_while(|character| *character == '#')
                .count();
            if hashes > 0 && hashes <= 6 && trimmed.chars().nth(hashes) == Some(' ') {
                let indent = &line[..line.len() - trimmed.len()];
                let level = (hashes + note_level).min(6);
                format!("{}{}{}", indent, "#".repeat(level), &trimmed[hashes..])
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn markdown_pdf_lines(markdown: &str) -> Vec<(String, u8, bool)> {
    let mut in_fence = false;
    markdown
        .lines()
        .map(|line| {
            let trimmed = line.trim();
            if trimmed.starts_with("```") || trimmed.starts_with("~~~") {
                in_fence = !in_fence;
                return (String::new(), 10, false);
            }
            if in_fence {
                return (format!("  {}", line), 9, false);
            }
            if trimmed.is_empty() {
                return (String::new(), 10, false);
            }
            let hashes = trimmed
                .chars()
                .take_while(|character| *character == '#')
                .count();
            if hashes > 0 && hashes <= 6 && trimmed.chars().nth(hashes) == Some(' ') {
                return (
                    clean_inline(&trimmed[hashes..]),
                    (20_i32 - hashes as i32 * 2).max(12) as u8,
                    true,
                );
            }
            let text = if let Some(rest) = trimmed.strip_prefix("> ") {
                format!("  {}", rest)
            } else if let Some(rest) = trimmed
                .strip_prefix("- ")
                .or_else(|| trimmed.strip_prefix("* "))
            {
                format!("• {}", rest)
            } else {
                trimmed.to_string()
            };
            (clean_inline(&text), 10, false)
        })
        .collect()
}

fn clean_inline(value: &str) -> String {
    let mut output = value
        .replace("**", "")
        .replace("__", "")
        .replace('`', "")
        .replace("~~", "");
    while let Some(start) = output.find('[') {
        let Some(mid) = output[start..].find("](") else {
            break;
        };
        let link_start = start + mid;
        let Some(end) = output[link_start + 2..].find(')') else {
            break;
        };
        let end = link_start + 2 + end;
        let label = output[start + 1..link_start].to_string();
        output.replace_range(start..=end, &label);
    }
    output
}

fn load_pdf_font_family() -> Result<fonts::FontFamily<fonts::FontData>, AppError> {
    #[cfg(target_os = "windows")]
    {
        let windows = std::env::var_os("WINDIR")
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from(r"C:\Windows"));
        let dir = windows.join("Fonts");
        let regular = fonts::FontData::load(dir.join("Deng.ttf"), None)
            .map_err(|error| AppError::Migration(error.to_string()))?;
        let bold = fonts::FontData::load(dir.join("Dengb.ttf"), None)
            .map_err(|error| AppError::Migration(error.to_string()))?;
        let italic = fonts::FontData::load(dir.join("Dengl.ttf"), None)
            .map_err(|error| AppError::Migration(error.to_string()))?;
        let bold_italic = fonts::FontData::load(dir.join("Dengb.ttf"), None)
            .map_err(|error| AppError::Migration(error.to_string()))?;
        return Ok(fonts::FontFamily {
            regular,
            bold,
            italic,
            bold_italic,
        });
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err(AppError::Migration(
            "Chinese PDF fonts are unavailable on this platform".into(),
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::{
        build_document, render_markdown, render_pdf, shift_markdown_headings, ExportFormat,
        ExportRequest, ExportScope,
    };
    use crate::domain::{Group, Note};
    fn note(id: i64, group_id: Option<i64>, title: &str, archived: bool) -> Note {
        Note {
            id,
            group_id,
            title: Some(title.into()),
            content_md: "# 正文标题\n内容".into(),
            content_html: String::new(),
            word_count: 4,
            is_pinned: false,
            is_content_hidden: false,
            is_archived: archived,
            is_trashed: false,
            trashed_at: None,
            geom_x: None,
            geom_y: None,
            geom_w: 280,
            geom_h: 360,
            edge_dock: crate::domain::EdgeDock::None,
            created_at: 0,
            updated_at: 0,
            color: None,
            sort_order: id,
        }
    }

    fn group(id: i64, name: &str) -> Group {
        Group {
            id,
            name: name.into(),
            color: None,
            background_color: None,
            icon: None,
            sort_order: id,
            pinned: false,
            collapsed: false,
            created_at: 0,
            updated_at: 0,
        }
    }

    #[test]
    fn markdown_uses_group_and_note_heading_levels() {
        let request = ExportRequest {
            scope: ExportScope::All,
            group_id: None,
            format: ExportFormat::Markdown,
            include_metadata: true,
        };
        let document = build_document(
            &request,
            &[group(1, "工作")],
            vec![note(1, Some(1), "计划", true)],
        )
        .unwrap();
        let markdown = render_markdown(&document, 0);
        assert!(markdown.contains("## 工作\n\n### 计划"));
        assert!(markdown.contains("> 状态：已归档"));
        assert!(markdown.contains("#### 正文标题"));
    }

    #[test]
    fn single_group_omits_duplicate_group_heading() {
        let request = ExportRequest {
            scope: ExportScope::Group,
            group_id: Some(1),
            format: ExportFormat::Markdown,
            include_metadata: false,
        };
        let document = build_document(
            &request,
            &[group(1, "工作")],
            vec![note(1, Some(1), "计划", false)],
        )
        .unwrap();
        let markdown = render_markdown(&document, 0);
        assert!(markdown.starts_with("# 工作\n"));
        assert!(markdown.contains("## 计划"));
        assert!(!markdown.contains("### 计划"));
    }

    #[test]
    fn heading_shift_skips_fenced_code() {
        let shifted = shift_markdown_headings("# 标题\n```md\n# 不变\n```", 3);
        assert!(shifted.contains("#### 标题"));
        assert!(shifted.contains("# 不变"));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn renders_a_chinese_pdf_with_the_system_font() {
        let request = ExportRequest {
            scope: ExportScope::All,
            group_id: None,
            format: ExportFormat::Pdf,
            include_metadata: true,
        };
        let document = build_document(
            &request,
            &[group(1, "工作")],
            vec![note(1, Some(1), "计划", false)],
        )
        .unwrap();
        let path =
            std::env::temp_dir().join(format!("tidbit-export-test-{}.pdf", std::process::id()));
        render_pdf(&document, 0, &path).unwrap();
        assert!(std::fs::metadata(&path).unwrap().len() > 512);
        let _ = std::fs::remove_file(path);
    }
}
