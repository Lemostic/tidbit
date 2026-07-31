use tidbit_lib::domain::{Group, Note};
use tidbit_lib::export::{build_document, render_markdown, render_pdf, ExportFormat, ExportRequest, ExportScope};
use std::fs;

fn main() {
    let request = ExportRequest {
        scope: ExportScope::All,
        group_id: None,
        format: ExportFormat::Pdf,
        include_metadata: true,
    };
    let groups = vec![Group { id: 1, name: "工作".into(), color: None, background_color: None, icon: None, sort_order: 1, pinned: false, collapsed: false, created_at: 0, updated_at: 0 }];
    let notes = vec![Note {
        id: 1,
        group_id: Some(1),
        title: Some("周报".into()),
        content_md: "# 正文标题\n## 子标题\n- 任务一\n- 任务二\n```rust\nfn main() { println!(\"hi\"); }\n```\n".into(),
        content_html: String::new(),
        word_count: 32,
        is_pinned: true,
        is_content_hidden: false,
        is_archived: false,
        is_trashed: false,
        trashed_at: None,
        geom_x: None,
        geom_y: None,
        geom_w: 280,
        geom_h: 360,
        edge_dock: tidbit_lib::domain::EdgeDock::None,
        created_at: 1_700_000_000_000,
        updated_at: 1_700_000_100_000,
        color: None,
        sort_order: 1,
    }];
    let document = build_document(&request, &groups, notes).unwrap();
    let md_path = "C:/Users/merit/Documents/Codex/2026-08-01/tidbit-export-pdf/outputs/all.md";
    fs::write(md_path, render_markdown(&document, 1_700_000_100_000)).unwrap();
    let pdf_path = "C:/Users/merit/Documents/Codex/2026-08-01/tidbit-export-pdf/outputs/all.pdf";
    render_pdf(&document, 1_700_000_100_000, std::path::Path::new(pdf_path)).unwrap();
    println!("wrote {md_path} and {pdf_path}");
}
