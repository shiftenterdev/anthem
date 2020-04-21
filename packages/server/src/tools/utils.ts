import bech32 from "bech32";
import moment from "moment-timezone";
import { identity, ifElse, lensProp, over } from "ramda";
import { IMsgDelegate, ITransaction, ITxMsg } from "../schema/graphql-types";
import { Price } from "../server/sources/exchange-data";
import NETWORKS, {
  NETWORK_NAME,
  NetworkDefinition,
} from "../server/sources/networks";

/** ===========================================================================
 * Utils
 * ============================================================================
 */

// Associate amount value to amounts key
const updateFn = over(lensProp("value"), (msg: IMsgDelegate) => ({
  ...msg,
  amounts: msg.amount,
}));

// Update amount key if it is an array
const updateAmounts = ifElse(
  ({ value }: ITxMsg) => {
    const { amount } = value as IMsgDelegate;
    return Boolean(amount && Array.isArray(amount));
  },
  updateFn,
  identity,
);

/**
 * Format the transaction response data.
 */
export const formatTransactionResponse = ({
  log,
  msgs,
  ...rest
}: any): ITransaction => ({
  ...rest,
  msgs: msgs.map(updateAmounts),
  log: Array.isArray(log) ? log : [log],
});

const getCosmosSdkAddressEnumsForNetwork = (name: NETWORK_NAME) => {
  const networkPrefix = name.toLowerCase();
  return {
    ACCOUNT_ADDRESS: `${networkPrefix}`,
    ACCOUNT_PUBLIC_KEY: `${networkPrefix}pub`,
    VALIDATOR_OPERATOR_ADDRESS: `${networkPrefix}valoper`,
    VALIDATOR_CONSENSUS_ADDRESS: `${networkPrefix}valcons`,
    VALIDATOR_CONSENSUS_PUBLIC_KEY: `${networkPrefix}valconspub`,
    VALIDATOR_OPERATOR_PUBLIC_KEY: `${networkPrefix}valoperpub`,
  };
};

/**
 * Decode a validator address using bech32 and re-encode it to derive the
 * associated validator address.
 */
export const getValidatorAddressFromDelegatorAddress = (
  address: string,
  network: NETWORK_NAME,
): string | null => {
  try {
    const networkAddressEnum = getCosmosSdkAddressEnumsForNetwork(network);
    const decodedAddress = bech32.decode(address);
    const validatorAddress = bech32.encode(
      networkAddressEnum.VALIDATOR_OPERATOR_ADDRESS,
      decodedAddress.words,
    );

    return validatorAddress;
  } catch (err) {
    return null;
  }
};

/**
 * Remove sanity check heights from the results, all the sanity check
 * heights are at 10_000 height intervals.
 */
export const filterSanityCheckHeights = (response: { height: number }) => {
  return response.height % 10000 !== 0;
};

/**
 * Convert response values with a sum field to a balance field
 * for consistency in response data.
 */
export const mapSumToBalance = (item: { sum: number }): { balance: number } => {
  return { ...item, balance: item.sum };
};

/**
 * Verify an object contains all of the given keys.
 */
export const objectHasKeys = (
  obj: any,
  keys: ReadonlyArray<string>,
): boolean => {
  for (const key of keys) {
    if (!(key in obj)) {
      return false;
    }
  }
  return true;
};

/**
 * Determine the network for a given address using the address prefix.
 */
export const deriveNetworkFromAddress = (
  address: string,
): NetworkDefinition => {
  if (address.substring(0, 6) === "cosmos") {
    return NETWORKS.COSMOS;
  } else if (address.substring(0, 5) === "terra") {
    return NETWORKS.TERRA;
  } else if (address.substring(0, 4) === "kava") {
    return NETWORKS.KAVA;
  } else if (address.length === 44) {
    return NETWORKS.OASIS;
  }

  throw new Error(
    `Unrecognized address ${address} with no associated network!`,
  );
};

/**
 * Get the network definition from a provided network name.
 */
export const getNetworkDefinitionFromIdentifier = (networkName: string) => {
  const name = networkName.toUpperCase();

  if (name in NETWORKS) {
    return NETWORKS[name];
  }

  throw new Error(
    `Unsupported or invalid network name ${networkName} supplied!`,
  );
};

/**
 * Convert a timestamp to UTC.
 */
export const convertTimestampToUTC = (timestamp: string | number | Date) => {
  const UTC_ISO = moment(new Date(timestamp))
    .tz("Etc/UTC")
    .toISOString();

  return UTC_ISO;
};

interface TimestampContainingType {
  timestamp: string;
}

/**
 * Convert all timestamps to the same ISO string format.
 */
export const standardizeTimestamps = (item: TimestampContainingType[]): any => {
  return item
    .filter((x: TimestampContainingType) => Boolean(x.timestamp))
    .map((x: TimestampContainingType) => {
      // Force timestamp to UTC and convert to string
      const ISO = convertTimestampToUTC(new Date(x.timestamp));
      return {
        ...x,
        timestamp: ISO,
      };
    });
};

/**
 * Calculate the OHLC average price for the price data.
 */
export const getAveragePrice = (price: Price) => {
  const { open, high, low, close } = price;
  return (open + high + low + close) / 4;
};
