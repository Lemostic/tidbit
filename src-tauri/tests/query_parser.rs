use tidbit_lib::ipc::query_parser::{parse_query, ParseError, Term};

fn t(text: &str, prefix: bool) -> Term {
    Term {
        text: text.to_string(),
        prefix,
    }
}

#[test]
fn empty_input_is_empty_error() {
    assert_eq!(parse_query(""), Err(ParseError::Empty));
    assert_eq!(parse_query("   "), Err(ParseError::Empty));
}

#[test]
fn single_word_is_one_include() {
    let parsed = parse_query("周报").unwrap();
    assert_eq!(parsed.includes, vec![t("周报", false)]);
    assert_eq!(parsed.highlight_terms(), vec!["周报".to_string()]);
}

#[test]
fn two_words_are_two_includes() {
    let parsed = parse_query("周报 团队").unwrap();
    assert_eq!(parsed.includes, vec![t("周报", false), t("团队", false)]);
}

#[test]
fn quoted_phrase_becomes_single_term() {
    let parsed = parse_query("\"周报 周三\"").unwrap();
    assert_eq!(parsed.includes, vec![t("周报 周三", false)]);
}

#[test]
fn trailing_star_on_word_marks_prefix() {
    let parsed = parse_query("周*").unwrap();
    assert_eq!(parsed.includes, vec![t("周", true)]);
}

#[test]
fn trailing_star_on_phrase_is_appended_outside_quote() {
    let parsed = parse_query("\"周报\"*").unwrap();
    assert_eq!(parsed.includes, vec![t("周报", true)]);
}

#[test]
fn mid_word_star_is_literal() {
    let parsed = parse_query("a*b").unwrap();
    assert_eq!(parsed.includes, vec![t("a*b", false)]);
}

#[test]
fn unbalanced_quote_returns_error() {
    assert_eq!(parse_query("\"周报"), Err(ParseError::UnbalancedQuote));
    assert_eq!(parse_query("周报\""), Err(ParseError::UnbalancedQuote));
}

#[test]
fn bare_star_is_empty() {
    assert_eq!(parse_query("*"), Err(ParseError::Empty));
}

#[test]
fn exclusion_tag_and_group_filters() {
    let parsed = parse_query("周报 -草稿 tag:工作 group:灵感").unwrap();
    assert_eq!(parsed.includes, vec![t("周报", false)]);
    assert_eq!(parsed.excludes, vec![t("草稿", false)]);
    assert_eq!(parsed.tags, vec!["工作".to_string()]);
    assert_eq!(parsed.group.as_deref(), Some("灵感"));
    assert_eq!(parsed.highlight_terms(), vec!["周报".to_string()]);
}
