use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ReminderLite {
    pub remind_at: i64,
    pub notified: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub repeat_rule: Option<String>,
}
#[derive(Debug, Clone, PartialEq)]
pub struct DueReminder {
    pub note_id: i64,
    pub remind_at: i64,
}

/// A parsed repeat rule stored as JSON in `note_reminder.repeat_rule`.
///
/// `freq` is one of `daily` / `weekly` / `monthly` / `yearly`; `interval`
/// is a positive multiplier (every N days/weeks/months/years). Serialized
/// with serde_json so future fields stay backward compatible.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub struct RepeatRule {
    pub freq: Frequency,
    #[serde(default = "default_interval")]
    pub interval: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Frequency {
    Daily,
    Weekly,
    Monthly,
    Yearly,
}

fn default_interval() -> u32 {
    1
}

impl RepeatRule {
    /// Parse from the stored JSON string; returns `None` for empty/malformed.
    pub fn parse(raw: &str) -> Option<Self> {
        if raw.trim().is_empty() {
            return None;
        }
        serde_json::from_str(raw).ok()
    }

    /// Compute the next reminder time strictly after `after` (ms epoch).
    pub fn next_after(&self, after: i64) -> Option<i64> {
        use chrono::{Datelike, TimeZone, Utc};
        let interval = self.interval.max(1) as i64;
        let base = Utc.timestamp_millis_opt(after).single()?;
        match self.freq {
            Frequency::Daily => {
                let day = base.date_naive() + chrono::Duration::days(interval);
                Some(Utc.from_local_datetime(&day.and_hms_opt(0, 0, 0)?).single()?.timestamp_millis())
            }
            Frequency::Weekly => {
                let day = base.date_naive() + chrono::Duration::weeks(interval);
                Some(Utc.from_local_datetime(&day.and_hms_opt(0, 0, 0)?).single()?.timestamp_millis())
            }
            Frequency::Monthly => {
                let (y, m, d) = (base.year(), base.month(), base.day());
                let mut target_y = y;
                let mut target_m = m as i32 + interval as i32;
                while target_m > 12 {
                    target_m -= 12;
                    target_y += 1;
                }
                let last_day = last_day_of_month(target_y, target_m as u32);
                let day = d.min(last_day);
                let date = chrono::NaiveDate::from_ymd_opt(target_y, target_m as u32, day)?;
                Some(Utc.from_local_datetime(&date.and_hms_opt(0, 0, 0)?).single()?.timestamp_millis())
            }
            Frequency::Yearly => {
                let target = base.date_naive() + chrono::Duration::days(365 * interval);
                Some(Utc.from_local_datetime(&target.and_hms_opt(0, 0, 0)?).single()?.timestamp_millis())
            }
        }
    }
}

fn last_day_of_month(year: i32, month: u32) -> u32 {
    match month {
        2 => {
            let leap = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
            if leap { 29 } else { 28 }
        }
        4 | 6 | 9 | 11 => 30,
        _ => 31,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{TimeZone, Utc};

    fn ms(y: i32, m: u32, d: u32) -> i64 {
        Utc.with_ymd_and_hms(y, m, d, 0, 0, 0).unwrap().timestamp_millis()
    }

    #[test]
    fn parses_and_advances_daily() {
        let rule = RepeatRule::parse(r#"{"freq":"daily","interval":1}"#).unwrap();
        assert_eq!(rule.next_after(ms(2026, 8, 2)), Some(ms(2026, 8, 3)));
    }

    #[test]
    fn weekly_advances_seven_days() {
        let rule = RepeatRule::parse(r#"{"freq":"weekly","interval":2}"#).unwrap();
        assert_eq!(rule.next_after(ms(2026, 8, 2)), Some(ms(2026, 8, 16)));
    }

    #[test]
    fn monthly_clamps_to_month_end() {
        let rule = RepeatRule::parse(r#"{"freq":"monthly","interval":1}"#).unwrap();
        // Jan 31 → Feb 28 in a non-leap year.
        assert_eq!(rule.next_after(ms(2026, 1, 31)), Some(ms(2026, 2, 28)));
        // Mar 31 → Apr 30.
        assert_eq!(rule.next_after(ms(2026, 3, 31)), Some(ms(2026, 4, 30)));
    }

    #[test]
    fn yearly_advances() {
        let rule = RepeatRule::parse(r#"{"freq":"yearly","interval":1}"#).unwrap();
        assert_eq!(rule.next_after(ms(2026, 8, 2)), Some(ms(2027, 8, 2)));
    }

    #[test]
    fn malformed_returns_none() {
        assert!(RepeatRule::parse("").is_none());
        assert!(RepeatRule::parse("not-json").is_none());
    }
}
