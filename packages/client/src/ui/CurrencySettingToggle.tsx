import { Radio, RadioGroup } from "@blueprintjs/core";
import { COLORS } from "constants/colors";
import { CURRENCY_SETTING } from "constants/fiat";
import Modules, { ReduxStoreState } from "modules/root";
import React from "react";
import { connect } from "react-redux";
import { composeWithProps } from "tools/context-utils";
import Toast from "./Toast";

/** ===========================================================================
 * Component
 * ============================================================================
 */

const CurrencySettingsToggle = (props: IProps) => {
  const { network, activeChartTab } = props;
  const { currencySetting, fiatCurrency } = props.settings;

  // Proxy to see if the user is viewing the dashboard chart
  const ON_CHART_VIEW = window.location.pathname.includes("cusd");
  const IS_CUSD = activeChartTab === "CUSD";
  const IS_CELO_COMMISSIONS =
    activeChartTab === "COMMISSIONS" && network.name === "CELO";
  const SHOULD_HIDE = IS_CUSD || IS_CELO_COMMISSIONS;

  /**
   * Hide the toggle on the chart view for certain Celo charts (cUSD only).
   */
  if (SHOULD_HIDE && ON_CHART_VIEW) {
    return null;
  }

  const handleSetCurrencyOption = (
    event: React.FormEvent<HTMLInputElement>,
  ) => {
    const value = event.currentTarget.value;

    // Check that the network supports fiat prices
    if (value === "fiat" && !props.network.supportsFiatPrices) {
      Toast.warn(
        `${props.network.name} network does not support fiat price data yet.`,
      );
    } else {
      props.updateSetting({
        currencySetting: value as CURRENCY_SETTING,
      });
    }
  };

  return (
    <RadioGroup
      inline
      selectedValue={currencySetting}
      onChange={handleSetCurrencyOption}
    >
      <Radio
        value="fiat"
        color={COLORS.CHORUS}
        label={fiatCurrency.name}
        data-cy="fiat-currency-setting-radio"
        disabled={!props.network.supportsFiatPrices}
      />
      <Radio
        value="crypto"
        color={COLORS.CHORUS}
        style={{ marginLeft: 8 }}
        label={props.network.descriptor}
        data-cy="crypto-currency-setting-radio"
      />
    </RadioGroup>
  );
};

/** ===========================================================================
 * Export
 * ============================================================================
 */

const mapStateToProps = (state: ReduxStoreState) => ({
  settings: Modules.selectors.settings(state),
  network: Modules.selectors.ledger.networkSelector(state),
  activeChartTab: Modules.selectors.app.appSelector(state).activeChartTab,
});

const dispatchProps = {
  updateSetting: Modules.actions.settings.updateSetting,
};

type ConnectProps = ReturnType<typeof mapStateToProps> & typeof dispatchProps;

interface ComponentProps {}

interface IProps extends ConnectProps, ComponentProps {}

const withProps = connect(mapStateToProps, dispatchProps);

export default composeWithProps<ComponentProps>(withProps)(
  CurrencySettingsToggle,
);
