import { useEffect, useState } from "react";

/** The id, of `ids`, whose element is across the middle of the viewport. */
export function useActiveSection(ids: readonly string[]): string {
  const [current, setCurrent] = useState(ids[0] ?? "");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids]);
  return current;
}
