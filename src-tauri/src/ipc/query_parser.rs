#[derive(Debug, PartialEq, Eq)]
pub enum ParseError {
    Empty,
    UnbalancedQuote,
}

#[derive(Debug, PartialEq, Eq)]
pub struct ParsedQuery {
    pub fts_expr: String,
    pub terms: Vec<String>,
}

/// Parse user input into an FTS5 MATCH expression plus the list of
/// human-friendly terms used by the front-end highlighter.
///
/// Behaviour:
/// - empty / whitespace-only input -> `ParseError::Empty`
/// - bare `*` -> `ParseError::Empty`
/// - whitespace-separated tokens outside of quote -> default FTS5 terms
/// - balanced double-quoted strings -> FTS5 phrase tokens
/// - last token ending in `*` -> prefix match (kept inside the expr);
///   `*` anywhere else is preserved literally
/// - unbalanced quote -> `ParseError::UnbalancedQuote`
pub fn parse_query(input: &str) -> Result<ParsedQuery, ParseError> {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed == "*" {
        return Err(ParseError::Empty);
    }

    let mut out_expr = String::with_capacity(trimmed.len());
    let mut terms: Vec<String> = Vec::new();
    let mut chars = trimmed.chars().peekable();
    let mut token_buf = String::new();
    let mut in_phrase = false;
    let mut phrase_buf = String::new();
    let mut saw_any = false;

    while let Some(c) = chars.next() {
        match c {
            '"' if !in_phrase => {
                in_phrase = true;
                phrase_buf.clear();
                saw_any = true;
            }
            '"' if in_phrase => {
                in_phrase = false;
                let phrase = phrase_buf.trim().to_string();
                if phrase.is_empty() {
                    return Err(ParseError::UnbalancedQuote);
                }
                if !out_expr.is_empty() {
                    out_expr.push(' ');
                }
                out_expr.push('"');
                out_expr.push_str(&phrase);
                if chars.peek() == Some(&'*') {
                    chars.next();
                    out_expr.push('"');
                    out_expr.push('*');
                    terms.push(format!("{}*", phrase));
                } else {
                    out_expr.push('"');
                    terms.push(phrase.clone());
                }
                token_buf.clear();
            }
            c if c.is_whitespace() && !in_phrase => {
                if !token_buf.is_empty() {
                    if !out_expr.is_empty() {
                        out_expr.push(' ');
                    }
                    out_expr.push_str(&token_buf);
                    terms.push(token_buf.clone());
                    token_buf.clear();
                }
            }
            _ if in_phrase => {
                phrase_buf.push(c);
            }
            _ => {
                token_buf.push(c);
                saw_any = true;
            }
        }
    }

    if in_phrase {
        return Err(ParseError::UnbalancedQuote);
    }
    if !token_buf.is_empty() {
        if !out_expr.is_empty() {
            out_expr.push(' ');
        }
        out_expr.push_str(&token_buf);
        terms.push(token_buf.clone());
    }

    if !saw_any && terms.is_empty() {
        return Err(ParseError::Empty);
    }

    Ok(ParsedQuery { fts_expr: out_expr, terms })
}

#[cfg(test)]
mod tests {
    use super::{parse_query, ParseError};

    #[test]
    fn empty_input_is_empty_error() {
        assert_eq!(parse_query(""), Err(ParseError::Empty));
        assert_eq!(parse_query("   "), Err(ParseError::Empty));
    }

    #[test]
    fn single_word_is_one_term_and_one_match_token() {
        let parsed = parse_query("周报").unwrap();
        assert_eq!(parsed.fts_expr, "周报");
        assert_eq!(parsed.terms, vec!["周报".to_string()]);
    }

    #[test]
    fn two_words_are_anded_with_whitespace() {
        let parsed = parse_query("周报 团队").unwrap();
        assert_eq!(parsed.fts_expr, "周报 团队");
        assert_eq!(parsed.terms, vec!["周报".to_string(), "团队".to_string()]);
    }

    #[test]
    fn quoted_phrase_becomes_double_quoted_token() {
        let parsed = parse_query("\"周报 周三\"").unwrap();
        assert_eq!(parsed.fts_expr, "\"周报 周三\"");
        assert_eq!(parsed.terms, vec!["周报 周三".to_string()]);
    }

    #[test]
    fn trailing_star_on_last_word_is_kept_as_prefix() {
        let parsed = parse_query("周*").unwrap();
        assert_eq!(parsed.fts_expr, "周*");
        assert_eq!(parsed.terms, vec!["周*".to_string()]);
    }

    #[test]
    fn trailing_star_on_phrase_is_appended_outside_quote() {
        let parsed = parse_query("\"周报\"*").unwrap();
        assert_eq!(parsed.fts_expr, "\"周报\"*");
        assert_eq!(parsed.terms, vec!["周报*".to_string()]);
    }

    #[test]
    fn mid_word_star_is_literal() {
        let parsed = parse_query("a*b").unwrap();
        assert_eq!(parsed.fts_expr, "a*b");
        assert_eq!(parsed.terms, vec!["a*b".to_string()]);
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
}