"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import useMediaQuery from "@/hooks/useMediaQuery";
import type { CommunityProject } from "@/types/v2/community";
import { projectToGrant } from "@/utilities/adapters/v2/projectToGrant";
import { GrantCard } from "../GrantCard";

interface ProjectsGridProps {
  projects: CommunityProject[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const MIN_CARD_WIDTH = 360;
  const MAX_COLUMNS_SMALL = 6;
  const MAX_COLUMNS_LARGE = 3;
  const gutterSize = 20;
  const isLargeViewport = useMediaQuery("(min-width: 80rem)");

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const updateWidth = useCallback(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [updateWidth]);

  const calculatedColumns = Math.floor(width / MIN_CARD_WIDTH);
  const columnCounter = calculatedColumns
    ? isLargeViewport
      ? MAX_COLUMNS_LARGE
      : Math.min(calculatedColumns, MAX_COLUMNS_SMALL)
    : 1;
  const columnWidth = width > 0 ? Math.floor(width / columnCounter) : 0;
  const rowCount = Math.ceil(projects.length / columnCounter);
  const rowHeight = 280;

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      {width > 0 && (
        <div
          style={{
            height: rowCount * rowHeight + 60,
            width,
            position: "relative",
          }}
        >
          {Array.from({ length: rowCount }, (_, rowIndex) =>
            Array.from({ length: columnCounter }, (_, columnIndex) => {
              const project = projects[rowIndex * columnCounter + columnIndex];
              const left = columnIndex * columnWidth + (columnIndex > 0 ? gutterSize : 0);
              const top = rowIndex * rowHeight + (rowIndex > 0 ? gutterSize : 0);
              const cellWidth = columnWidth - (columnIndex > 0 ? gutterSize : 0);
              const cellHeight = rowHeight - (rowIndex > 0 ? gutterSize : 0);

              return (
                <div
                  key={`${rowIndex}-${columnIndex}`}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    width: cellWidth,
                    height: cellHeight,
                  }}
                >
                  {project && (
                    <div style={{ height: "100%", width: "100%" }}>
                      <GrantCard
                        index={rowIndex * columnCounter + columnIndex}
                        key={project.uid}
                        grant={projectToGrant(project)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
