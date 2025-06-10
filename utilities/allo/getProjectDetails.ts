import axios from "axios";
import { applicationsQuery } from "@/utilities/allo-v2-queries/applications";
import { errorManager } from "@/components/Utilities/errorManager";


export async function getProjectDetails(chainId: number, applicationId: string, roundId: string) {
    const projectDetails = await axios.post("https://grants-stack-indexer-v2.gitcoin.co/graphql", applicationsQuery(
        chainId,
        applicationId,
        roundId
    )).then((res) => res.data.data.applications[0]).catch((err) => {
        errorManager("Error while fetching project details", err)
        return null
    })

    return projectDetails
}