"use client";
import { useEffect } from "react";
import { IProjectResponse } from "@show-karma/karma-gap-sdk/core/class/karma-indexer/api/types";
import { cleanMarkdownForPlainText } from "@/utilities/markdown";
import { defaultMetadata } from "@/utilities/meta";
import { envVars } from "@/utilities/enviromentVars";

interface ClientMetadataProps {
  project: IProjectResponse | null;
  projectId: string;
}

export const ClientMetadata = ({ project, projectId }: ClientMetadataProps) => {
  useEffect(() => {
    if (!project) return;

    const title = `${project.details?.data?.title} | Karma GAP`;
    const description = cleanMarkdownForPlainText(
      project.details?.data?.description || "",
      160
    ) || defaultMetadata.description;

    // Update document title
    document.title = title;

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", description);
    } else {
      const newMetaDescription = document.createElement("meta");
      newMetaDescription.name = "description";
      newMetaDescription.content = description;
      document.head.appendChild(newMetaDescription);
    }

    // Update Open Graph meta tags
    const updateOrCreateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (meta) {
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    };

    updateOrCreateMeta("og:title", title);
    updateOrCreateMeta("og:description", description);
    updateOrCreateMeta("og:image", `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`);
    updateOrCreateMeta("og:url", window.location.href);

    // Update Twitter Card meta tags
    const updateOrCreateTwitterMeta = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (meta) {
        meta.setAttribute("content", content);
      } else {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        meta.setAttribute("content", content);
        document.head.appendChild(meta);
      }
    };

    updateOrCreateTwitterMeta("twitter:title", title);
    updateOrCreateTwitterMeta("twitter:description", description);
    updateOrCreateTwitterMeta("twitter:image", `${envVars.VERCEL_URL}/api/metadata/projects/${projectId}`);
    updateOrCreateTwitterMeta("twitter:card", "summary_large_image");

  }, [project, projectId]);

  return null; // This component doesn't render anything
}; 