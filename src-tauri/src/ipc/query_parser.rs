//! Parse a user search query into structured terms and filters.
//!
//! Grammar (task 09-25-search-query-syntax PRD):
//!   word        -> include term (substring match, LIKE-based)
//!   word*       -> include term, prefix match; `*` elsewhere is literal
//!   "ph rase"   -> single include term keeping inner spaces
//!   "ph rase"*  -> prefix include term
//!   -word       -> exclude term (quotes and `*` suffix work the same way)
//!   tag:name    -> tag filter, repeatable (AND); quote the name for spaces
//!   group:name  -> group filter; repeated occurrences: last one wins
//!
//! The engine stays LIKE-based on purpose: the bundled SQLCipher FTS5 build
//! only has the unicode61 tokenizer, which indexes a run of CJK characters
//! as one token, so MATCH cannot do Chinese substring search (see
//! `.trellis/tasks/09-25-search-query-syntax/research/`). Quotes switch to
//! quoted mode anywhere inside a token; quoted content keeps whitespace and
//! treats `*` as literal. A trailing `*` only marks a prefix when it sits
//! outside quotes (directly after the closing quote or at the end of a bare
//! word). An unterminated quote is [`ParseError::UnbalancedQuote`].

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ParseError {
    /// Input has no usable term or filter at all (also: a bare `*`).
    Empty,
    /// A `"` was opened but never closed.
    UnbalancedQuote,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Term {
    /// Match text with quotes and prefix markers removed.
    pub text: String,
    /// `true` when the term should match as a prefix instead of a substring.
    pub prefix: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ParsedQuery {
    pub includes: Vec<Term>,
    pub excludes: Vec<Term>,
    /// Values of `tag:` tokens; the engine ANDs them.
    pub tags: Vec<String>,
    /// Value of the last `group:` token, if any.
    pub group: Option<String>,
}

impl ParsedQuery {
    /// Positive highlight terms (include texts, `*` markers removed) for the
    /// front-end substring highlighter.
    pub fn highlight_terms(&self) -> Vec<String> {
        self.includes.iter().map(|t| t.text.clone()).collect()
    }
}

/// A whitespace-delimited token before tag/group/exclusion classification.
struct RawToken {
    text: String,
    prefix: bool,
}

pub fn parse_query(q: &str) -> Result<ParsedQuery, ParseError> {
    let mut parsed = ParsedQuery::default();
    for token in tokenize(q)? {
        classify(token, &mut parsed);
    }
    if parsed.includes.is_empty()
        && parsed.excludes.is_empty()
        && parsed.tags.is_empty()
        && parsed.group.is_none()
    {
        return Err(ParseError::Empty);
    }
    Ok(parsed)
}

/// Split input into tokens, honoring quotes and trailing-star prefixes.
fn tokenize(q: &str) -> Result<Vec<RawToken>, ParseError> {
    let mut tokens = Vec::new();
    let mut text = String::new();
    let mut last_from_quote = false;
    let mut in_quotes = false;

    // A trailing `*` only counts as a prefix marker when it did not come
    // from inside quotes; stars inside quotes are literal.
    fn end_token(tokens: &mut Vec<RawToken>, text: &mut String, last_from_quote: bool) {
        let mut prefix = false;
        if !last_from_quote {
            while text.ends_with('*') {
                text.pop();
                prefix = true;
            }
        }
        if !text.is_empty() {
            tokens.push(RawToken {
                text: std::mem::take(text),
                prefix,
            });
        }
    }

    for ch in q.chars() {
        match ch {
            '"' => in_quotes = !in_quotes,
            c if c.is_whitespace() && !in_quotes => {
                end_token(&mut tokens, &mut text, last_from_quote);
                last_from_quote = false;
            }
            c => {
                text.push(c);
                last_from_quote = in_quotes;
            }
        }
    }
    if in_quotes {
        return Err(ParseError::UnbalancedQuote);
    }
    end_token(&mut tokens, &mut text, last_from_quote);
    Ok(tokens)
}

fn classify(token: RawToken, out: &mut ParsedQuery) {
    let RawToken { text, prefix } = token;
    if let Some(value) = text.strip_prefix("tag:") {
        let value = value.trim_end_matches('*').trim();
        if !value.is_empty() {
            out.tags.push(value.to_string());
        }
        return;
    }
    if let Some(value) = text.strip_prefix("group:") {
        let value = value.trim_end_matches('*').trim();
        if !value.is_empty() {
            out.group = Some(value.to_string());
        }
        return;
    }
    if let Some(rest) = text.strip_prefix('-') {
        if !rest.is_empty() {
            out.excludes.push(Term {
                text: rest.to_string(),
                prefix,
            });
        }
        return;
    }
    out.includes.push(Term { text, prefix });
}

#[cfg(test)]
mod tests {
    use super::{parse_query, ParseError, ParsedQuery, Term};

    fn t(text: &str, prefix: bool) -> Term {
        Term {
            text: text.to_string(),
            prefix,
        }
    }

    fn parse_ok(q: &str) -> ParsedQuery {
        parse_query(q).unwrap()
    }

    #[test]
    fn empty_input_is_empty_error() {
        assert_eq!(parse_query(""), Err(ParseError::Empty));
        assert_eq!(parse_query("   "), Err(ParseError::Empty));
    }

    #[test]
    fn single_word_is_one_include() {
        assert_eq!(parse_ok("周报").includes, vec![t("周报", false)]);
    }

    #[test]
    fn two_words_are_two_includes() {
        assert_eq!(
            parse_ok("周报 团队").includes,
            vec![t("周报", false), t("团队", false)]
        );
    }

    #[test]
    fn quoted_phrase_keeps_inner_space_as_one_term() {
        assert_eq!(
            parse_ok("\"周报 周三\"").includes,
            vec![t("周报 周三", false)]
        );
    }

    #[test]
    fn trailing_star_on_word_marks_prefix() {
        assert_eq!(parse_ok("周*").includes, vec![t("周", true)]);
        assert_eq!(parse_ok("2026*").includes, vec![t("2026", true)]);
    }

    #[test]
    fn trailing_star_after_quote_marks_prefix() {
        assert_eq!(parse_ok("\"周报\"*").includes, vec![t("周报", true)]);
    }

    #[test]
    fn mid_word_star_is_literal() {
        assert_eq!(parse_ok("a*b").includes, vec![t("a*b", false)]);
    }

    #[test]
    fn star_inside_quotes_is_literal() {
        assert_eq!(parse_ok("\"a*b\"").includes, vec![t("a*b", false)]);
    }

    #[test]
    fn repeated_trailing_stars_collapse_to_prefix() {
        assert_eq!(parse_ok("a**").includes, vec![t("a", true)]);
    }

    #[test]
    fn unbalanced_quote_returns_error() {
        assert_eq!(parse_query("\"周报"), Err(ParseError::UnbalancedQuote));
        assert_eq!(parse_query("周报\""), Err(ParseError::UnbalancedQuote));
    }

    #[test]
    fn bare_star_is_empty() {
        assert_eq!(parse_query("*"), Err(ParseError::Empty));
        assert_eq!(
            parse_ok("a * b").includes,
            vec![t("a", false), t("b", false)]
        );
    }

    #[test]
    fn empty_quotes_are_ignored() {
        assert_eq!(parse_query("\"\""), Err(ParseError::Empty));
        assert_eq!(parse_ok("\"\" 周报").includes, vec![t("周报", false)]);
    }

    #[test]
    fn exclusion_word_and_quoted_phrase() {
        let parsed = parse_ok("-草稿");
        assert!(parsed.includes.is_empty());
        assert_eq!(parsed.excludes, vec![t("草稿", false)]);

        let parsed = parse_ok("周报 -\"旧版 计划\" -待办*");
        assert_eq!(parsed.includes, vec![t("周报", false)]);
        assert_eq!(
            parsed.excludes,
            vec![t("旧版 计划", false), t("待办", true)]
        );
    }

    #[test]
    fn lone_dash_is_ignored() {
        assert_eq!(parse_query("-"), Err(ParseError::Empty));
    }

    #[test]
    fn tag_filter_supports_quotes_and_repeat() {
        assert_eq!(parse_ok("tag:工作").tags, vec!["工作".to_string()]);
        assert_eq!(
            parse_ok("tag:\"待 整理\"").tags,
            vec!["待 整理".to_string()]
        );
        assert_eq!(
            parse_ok("tag:工作 tag:灵感").tags,
            vec!["工作".to_string(), "灵感".to_string()]
        );
    }

    #[test]
    fn empty_tag_value_is_ignored() {
        assert_eq!(parse_query("tag:"), Err(ParseError::Empty));
    }

    #[test]
    fn group_filter_last_wins() {
        assert_eq!(parse_ok("group:灵感").group.as_deref(), Some("灵感"));
        assert_eq!(
            parse_ok("group:灵感 group:工作").group.as_deref(),
            Some("工作")
        );
    }

    #[test]
    fn full_query_parses_every_part() {
        let parsed = parse_ok("周报 团队 -草稿 tag:工作 group:灵感 2026*");
        assert_eq!(
            parsed.includes,
            vec![t("周报", false), t("团队", false), t("2026", true)]
        );
        assert_eq!(parsed.excludes, vec![t("草稿", false)]);
        assert_eq!(parsed.tags, vec!["工作".to_string()]);
        assert_eq!(parsed.group.as_deref(), Some("灵感"));
        assert_eq!(parsed.highlight_terms(), vec!["周报", "团队", "2026"]);
    }

    #[test]
    fn filters_alone_are_valid() {
        let parsed = parse_ok("tag:工作");
        assert!(parsed.includes.is_empty());
        assert_eq!(parsed.tags, vec!["工作".to_string()]);

        let parsed = parse_ok("-草稿");
        assert!(parsed.includes.is_empty());
        assert_eq!(parsed.excludes, vec![t("草稿", false)]);
    }
}
