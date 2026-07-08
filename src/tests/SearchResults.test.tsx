import { render, screen } from "@testing-library/react";
import { SearchResults } from "../features/search/SearchResults";

describe("SearchResults", () => {
  it("renders hits", () => {
    render(
      <SearchResults
        hits={[{ id: 1, group_id: null, title: "x", snippet: "abc" }]}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText(/x/)).toBeInTheDocument();
  });

  it("renders multiple hits", () => {
    render(
      <SearchResults
        hits={[
          { id: 1, group_id: null, title: "First Note", snippet: "content a" },
          { id: 2, group_id: null, title: "Second Note", snippet: "content b" },
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
        hits={[{ id: 42, group_id: null, title: "Test", snippet: "test" }]}
        onOpen={onOpen}
      />
    );
    screen.getByText(/Test/).click();
    expect(onOpen).toHaveBeenCalledWith(42);
  });
});
