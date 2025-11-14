import {
  GAP,
  type IProjectDetails,
  MemberOf,
  nullRef,
  Project,
  ProjectDetails,
} from "@show-karma/karma-gap-sdk"
import type { Hex } from "viem"

// import type { GAP } from "@show-karma/karma-gap-sdk/core/class/GAP";

interface ProjectFormData {
  title: string
  description: string
  problem?: string
  solution?: string
  missionSummary?: string
  locationOfImpact?: string
  profilePicture?: string
  imageURL?: string
  twitter?: string
  github?: string
  discord?: string
  website?: string
  linkedin?: string
  pitchDeck?: string
  demoVideo?: string
  farcaster?: string
  recipient?: string
  businessModel?: string
  stageIn?: string
  raisedMoney?: string
  pathToTake?: string
  customLinks?: Array<{ name: string; url: string }>
}

export interface AttestationTransaction {
  to: string
  data: string
  value: string
  from?: string
}

/**
 * Builds the transaction data for a project attestation without executing it.
 * This is used to get accurate gas estimates for the faucet.
 */
export async function buildProjectAttestationTransaction(
  projectData: ProjectFormData,
  walletSigner: any,
  gapClient: GAP,
  recipient: Hex
): Promise<AttestationTransaction> {
  try {
    // Create the Project attestation object
    const project = new Project({
      data: {
        project: true,
      },
      schema: gapClient.findSchema("Project"),
      recipient: recipient,
      uid: nullRef,
    })

    // Generate slug for the project
    const slug = await gapClient.generateSlug(projectData.title)

    // Prepare project details data
    const projectDetailsData: IProjectDetails = {
      title: projectData.title,
      description: projectData.description,
      problem: projectData.problem || "",
      solution: projectData.solution || "",
      missionSummary: projectData.missionSummary || "",
      locationOfImpact: projectData.locationOfImpact || "",
      imageURL: projectData.imageURL || projectData.profilePicture || "",
      slug,
      businessModel: projectData.businessModel,
      stageIn: projectData.stageIn,
      raisedMoney: projectData.raisedMoney,
      pathToTake: projectData.pathToTake,
      links: [
        { type: "twitter", url: projectData.twitter || "" },
        { type: "github", url: projectData.github || "" },
        { type: "discord", url: projectData.discord || "" },
        { type: "website", url: projectData.website || "" },
        { type: "linkedin", url: projectData.linkedin || "" },
        { type: "pitchDeck", url: projectData.pitchDeck || "" },
        { type: "demoVideo", url: projectData.demoVideo || "" },
        { type: "farcaster", url: projectData.farcaster || "" },
        ...(projectData.customLinks?.map((link) => ({
          type: "custom" as const,
          name: link.name,
          url: link.url,
        })) || []),
      ],
    }

    // Create ProjectDetails attestation
    project.details = new ProjectDetails({
      data: projectDetailsData,
      refUID: project.uid,
      schema: gapClient.findSchema("ProjectDetails"),
      recipient: project.recipient,
      uid: nullRef,
    })

    // Add member (the creator)
    const member = new MemberOf({
      data: {
        memberOf: true,
      },
      refUID: project.uid,
      schema: gapClient.findSchema("MemberOf"),
      recipient: recipient,
      uid: nullRef,
    })
    project.members = [member]

    // Build the multi-attestation payload
    const payload = await project.multiAttestPayload()

    // Get the MultiAttester contract
    const contract = await GAP.getMulticall(walletSigner)

    // Populate the transaction without executing it
    const populatedTx = await contract.multiSequentialAttest.populateTransaction(
      payload.map((p: { payload: any }[]) => p[1].payload)
    )

    // Get the contract address
    const contractAddress = await contract.getAddress()
    const signerAddress = await walletSigner.getAddress()

    return {
      to: contractAddress,
      data: populatedTx.data || "0x",
      value: "0",
      from: signerAddress,
    }
  } catch (error) {
    console.error("Failed to build attestation transaction:", error)
    throw error
  }
}
