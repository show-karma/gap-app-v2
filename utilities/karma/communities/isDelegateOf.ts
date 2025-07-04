import axios from "axios";

import { karmaAPI } from "../karma";
import { errorManager } from "@/components/Utilities/errorManager";

export const isDelegateOf = async (community: string, address: string) => {
  try {
    const { data } = await axios.get(karmaAPI.findDelegate(community, address));
    return data?.data.delegate;
  } catch (error: any) {
    console.log(
      "Error trying to get voting power of: ",
      address,
      " in community: ",
      community,
      error
    );
    errorManager(
      `Error trying to get voting power of: ${address} in community: ${community}`,
      error
    );
    return null;
  }
};
