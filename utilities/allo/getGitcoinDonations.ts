import axios from "axios";
import { donationsByApplicationQuery } from "@/utilities/allo-v2-queries/donationsByApplication";
import { errorManager } from "@/components/Utilities/errorManager";

export async function getGitcoinDonations(
    chainId: number,
    applicationId: string,
    roundId: string
) {
    const donations = await axios.post("https://grants-stack-indexer-v2.gitcoin.co/graphql", donationsByApplicationQuery(
        chainId,
        applicationId,
        roundId
    )).then((res) => res.data.data.donations).catch((err) => {
        errorManager("Error while fetching gitcoin donations", err)
        return []
    })

    return donations
}
