"use client";
import { ProjectV2 } from "@/types/community";
import { projectV2ToGrant } from "@/utilities/adapters/projectV2ToGrant";
import { AutoSizer, Grid } from "react-virtualized";
import { GrantCard } from "../GrantCard";

interface ProjectsGridProps {
  projects: ProjectV2[];
}

export function ProjectsGrid({ projects }: ProjectsGridProps) {
  return (
    <AutoSizer disableHeight>
      {({ width }) => {
        const columns = Math.floor(width / 360);
        const columnCounter = columns ? (columns > 6 ? 6 : columns) : 1;
        const columnWidth = Math.floor(width / columnCounter);
        const gutterSize = 20;
        const height = Math.ceil(projects.length / columnCounter) * 360;

        return (
          <Grid
            key={`grid-${width}-${columnCounter}`}
            height={height + 60}
            width={width}
            rowCount={Math.ceil(projects.length / columnCounter)}
            rowHeight={360}
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
                        grant={projectV2ToGrant(project)}
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