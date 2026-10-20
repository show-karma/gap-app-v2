import type {
  CreatePanelCommentRequest,
  CreatePanelRequest,
  Panel,
  PanelComment,
  PanelDetail,
  PanelVersion,
  UpdatePanelCommentRequest,
  UpdatePanelRequest,
} from "@/types/panels";
import { createAuthenticatedApiClient } from "@/utilities/auth/api-client";
import { envVars } from "@/utilities/enviromentVars";

const API_URL = envVars.NEXT_PUBLIC_GAP_INDEXER_URL;
const apiClient = createAuthenticatedApiClient(API_URL, 60000);

export const panelsPath = (community: string) =>
  `/v2/communities/${encodeURIComponent(community)}/panels`;

export const panelPath = (community: string, panelId: string) =>
  `${panelsPath(community)}/${encodeURIComponent(panelId)}`;

export const panelTurnsUrl = (community: string, panelId: string) =>
  `${API_URL}${panelPath(community, panelId)}/turns`;

export async function listPanels(community: string): Promise<Panel[]> {
  const { data } = await apiClient.get(panelsPath(community));
  return data;
}

export async function createPanel(community: string, body: CreatePanelRequest): Promise<Panel> {
  const { data } = await apiClient.post(panelsPath(community), body);
  return data;
}

export async function getPanel(community: string, panelId: string): Promise<PanelDetail> {
  const { data } = await apiClient.get(panelPath(community, panelId));
  return data;
}

export async function updatePanel(
  community: string,
  panelId: string,
  body: UpdatePanelRequest
): Promise<Panel> {
  const { data } = await apiClient.patch(panelPath(community, panelId), body);
  return data;
}

export async function deletePanel(community: string, panelId: string): Promise<void> {
  await apiClient.delete(panelPath(community, panelId));
}

export async function getPanelVersion(
  community: string,
  panelId: string,
  versionId: string
): Promise<PanelVersion> {
  const { data } = await apiClient.get(
    `${panelPath(community, panelId)}/versions/${encodeURIComponent(versionId)}`
  );
  return data;
}

export async function createPanelComment(
  community: string,
  panelId: string,
  body: CreatePanelCommentRequest
): Promise<PanelComment> {
  const { data } = await apiClient.post(`${panelPath(community, panelId)}/comments`, body);
  return data;
}

export async function updatePanelComment(
  community: string,
  panelId: string,
  commentId: string,
  body: UpdatePanelCommentRequest
): Promise<PanelComment> {
  const { data } = await apiClient.patch(
    `${panelPath(community, panelId)}/comments/${encodeURIComponent(commentId)}`,
    body
  );
  return data;
}

export async function deletePanelComment(
  community: string,
  panelId: string,
  commentId: string
): Promise<void> {
  await apiClient.delete(
    `${panelPath(community, panelId)}/comments/${encodeURIComponent(commentId)}`
  );
}
