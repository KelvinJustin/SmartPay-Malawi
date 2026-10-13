import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement scrolling; the router's scroll restoration calls it.
window.scrollTo = () => {};
