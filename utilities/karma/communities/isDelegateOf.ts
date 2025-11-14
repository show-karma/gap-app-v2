import axios from "axios"
import { errorManager } from "@/components/Utilities/errorManager"
import { karmaAPI } from "../karma"

export const isDelegateOf = async (community: string, address: string) => {
  try {
    const { data } = await axios.get(karmaAPI.findDelegate(community, address))
    return data?.data.delegate
  } catch (error: any) {
    errorManager(
      `Error trying to get voting power of: ${address} in community: ${community}`,
      error
    )
    return null
  }
}
