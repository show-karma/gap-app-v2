"use client";
import { AutoSizer, Grid } from "react-virtualized";
import useMediaQuery from "@/hooks/useMediaQuery";
import type { Project } from "@/types/v2/community";
import { projectToGrant } from "@/utilities/adapters/v2/projectToGrant";
import { GrantCard } from "../GrantCard";

interface ProjectsGridProps {
  projects: Project[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  const MIN_CARD_WIDTH = 360;
  const MAX_COLUMNS_SMALL = 6;
  const MAX_COLUMNS_LARGE = 3;
  const gutterSize = 20;
  const isLargeViewport = useMediaQuery("(min-width: 80rem)");

  return (
    <AutoSizer disableHeight>
      {({ width }) => {
        const calculatedColumns = Math.floor(width / MIN_CARD_WIDTH);
        const columnCounter = calculatedColumns
          ? isLargeViewport
            ? MAX_COLUMNS_LARGE
            : Math.min(calculatedColumns, MAX_COLUMNS_SMALL)
          : 1;
        const columnWidth = Math.floor(width / columnCounter);
        const height = Math.ceil(projects.length / columnCounter) * 280;

        return (
          <Grid
            key={`grid-${width}-${columnCounter}-${isLargeViewport}`}
            height={height + 60}
            width={width}
            rowCount={Math.ceil(projects.length / columnCounter)}
            rowHeight={280}
            columnWidth={columnWidth}
            columnCount={columnCounter}
            cellRenderer={({ columnIndex, key, rowIndex, style }) => {
              const project = projects[rowIndex * columnCounter + columnIndex];
              return (
                <div
                  key={key}
                  style={{
                    ...style,
                    left: +(style.left || 0) + (columnIndex > 0 ? gutterSize : 0),
                    width: +(style.width || 0) - (columnIndex > 0 ? gutterSize : 0),
                    top: +(style.top || 0) + (rowIndex > 0 ? gutterSize : 0),
                    height: +(style.height || 0) - (rowIndex > 0 ? gutterSize : 0),
                  }}
                >
                  {project && (
                    <div
                      style={{
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <GrantCard
                        index={rowIndex * columnCounter + columnIndex}
                        key={project.uid}
                        grant={projectToGrant(project)}
                      />
                    </div>
                  )}
                </div>
              );
            }}
          />
        );
      }}
    </AutoSizer>
  );
}
