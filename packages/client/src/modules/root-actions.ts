import App from "./app/actions";
import Ledger from "./ledger/actions";
import Settings from "./settings/actions";
import Transaction from "./transaction/actions";

/** ===========================================================================
 * All Actions
 * ============================================================================
 */

export const Actions = {
  ...App,
  ...Ledger,
  ...Settings,
  ...Transaction,
};
