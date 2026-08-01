import { render, screen } from "@testing-library/react";
import { SearchResults } from "../features/search/SearchResults";
import type { SearchHit } from "../features/search/SearchProvider";

function hit(partial: Partial<SearchHit> & { id: number }): SearchHit {
  return { group_id: null, title: "x", snippet: "abc", terms: [], score: 0, ...partial };
}

describe("SearchResults", () => {
  it("renders hits", () => {
    render(
      <SearchResults
        hits={[hit({ id: 1 })]}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText(/x/)).toBeInTheDocument();
  });

  it("renders multiple hits", () => {
    render(
      <SearchResults
        hits={[
          hit({ id: 1, title: "First Note", snippet: "content a" }),
          hit({ id: 2, title: "Second Note", snippet: "content b" }),
        ]}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText(/First Note/)).toBeInTheDocument();
    expect(screen.getByText(/Second Note/)).toBeInTheDocument();
  });

  it("calls onOpen with correct id on click", () => {
    const onOpen = vi.fn();
    render(
      <SearchResults
        hits={[hit({ id: 42, title: "Test", snippet: "test" })]}
        onOpen={onOpen}
      />
    );
    screen.getByText(/Test/).click();
    expect(onOpen).toHaveBeenCalledWith(42);
  });

  it("wraps matching terms in mark elements", () => {
    render(
      <SearchResults
        hits={[hit({ id: 1, snippet: "寻找便签内容", terms: ["便签"] })]}
        onOpen={() => {}}
      />
    );
    const mark = document.querySelector(".search-result__mark");
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe("便签");
  });
});
