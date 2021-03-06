import * as Sentry from "@sentry/browser";
import { CosmosTransactionsProps } from "graphql/queries";
import Modules, { ReduxStoreState } from "modules/root";
import { i18nSelector } from "modules/settings/selectors";
import React from "react";
import { connect } from "react-redux";
import { composeWithProps } from "tools/context-utils";
import { PanelMessageText } from "ui/SharedComponents";
import CosmosValidators from "ui/validators/CosmosValidators";
import CeloValidators from "./CeloValidators";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

interface IState {
  hasError: boolean;
}

/** ===========================================================================
 * React Component
 * ============================================================================
 */

class PortfolioSwitchContainer extends React.Component<IProps, IState> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  constructor(props: IProps) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  componentDidCatch(error: Error) {
    // Log the error to Sentry.
    Sentry.captureException(error);
  }

  componentDidUpdate(prevProps: IProps) {
    if (
      this.state.hasError &&
      this.props.ledger.network.name !== prevProps.ledger.network.name
    ) {
      this.setState({ hasError: false });
    }
  }

  render(): Nullable<JSX.Element> {
    if (this.state.hasError) {
      return (
        <PanelMessageText>
          {this.props.i18n.tString("Error fetching data...")}
        </PanelMessageText>
      );
    }

    const { network } = this.props.ledger;

    if (!network.supportsValidatorsList) {
      return (
        <PanelMessageText>
          Staking is not supported yet for <b>{network.name}</b>.
        </PanelMessageText>
      );
    }

    switch (network.name) {
      case "COSMOS":
        return <CosmosValidators />;
      case "OASIS":
        return null;
      case "CELO":
        return <CeloValidators />;
      default:
        return null;
    }
  }
}

/** ===========================================================================
 * Props
 * ============================================================================
 */

const mapStateToProps = (state: ReduxStoreState) => ({
  i18n: i18nSelector(state),
  ledger: Modules.selectors.ledger.ledgerSelector(state),
});

const withProps = connect(mapStateToProps);

interface ComponentProps {}

type ConnectProps = ReturnType<typeof mapStateToProps>;

interface IProps
  extends ConnectProps,
    CosmosTransactionsProps,
    ComponentProps {}

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default composeWithProps<ComponentProps>(withProps)(
  PortfolioSwitchContainer,
);
