import { assertUnreachable } from "@anthem/utils";
import { H5 } from "@blueprintjs/core";
import * as Sentry from "@sentry/browser";
import {
  CosmosAccountHistoryProps,
  FiatPriceHistoryProps,
  GraphQLConfigProps,
  withCosmosAccountHistory,
  withFiatPriceHistory,
  withGraphQLVariables,
} from "graphql/queries";
import * as Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Analytics from "lib/analytics-lib";
import Modules, { ReduxStoreState } from "modules/root";
import { i18nSelector } from "modules/settings/selectors";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { throttle } from "throttle-debounce";
import { ChartData, getHighchartsChartOptions } from "tools/chart-utils";
import { BASE_CHART_TABS, getPortfolioTypeFromUrl } from "tools/client-utils";
import { composeWithProps } from "tools/context-utils";
import {
  getChartTotalGraph,
  processPortfolioHistoryData,
} from "tools/cosmos-chart-utils";
import { chartExportBuilder } from "tools/csv-utils";
import { GraphQLGuardComponent } from "ui/GraphQLGuardComponents";
import CurrencySettingsToggle from "../CurrencySettingToggle";
import {
  Button,
  Centered,
  DashboardError,
  DashboardLoader,
  Row,
  View,
} from "../SharedComponents";
import Toast from "../Toast";

/** ===========================================================================
 * Types & Config
 * ============================================================================
 */

export interface PortfolioChartData {
  availableChartData: ChartData;
  rewardsChartData: ChartData;
  rewardsDailySummary: ChartData;
  delegationsChartData: ChartData;
  unbondingChartData: ChartData;
  validatorRewardsChartData: ChartData;
  validatorDailySummary: ChartData;
}

interface IState {
  portfolioChartData: Nullable<PortfolioChartData>;
}

/** ===========================================================================
 * React Component
 * ============================================================================
 */

class PortfolioLoadingContainer extends React.PureComponent<
  IProps,
  { displayLoadingMessage: boolean }
> {
  loadingTimer: Nullable<number> = null;

  constructor(props: IProps) {
    super(props);

    this.state = {
      displayLoadingMessage: false,
    };
  }

  componentDidMount() {
    if (this.props.cosmosAccountHistory.loading) {
      this.startLoadingTimer();
    }
  }

  componentWillUnmount() {
    this.cancelLoadingTimer();
  }

  componentDidUpdate() {
    if (this.props.cosmosAccountHistory.loading) {
      this.startLoadingTimer();
    }

    if (!this.props.cosmosAccountHistory.loading) {
      this.cancelLoadingTimer();
    }
  }

  render(): JSX.Element {
    const { displayLoadingMessage } = this.state;
    const { i18n, cosmosAccountHistory } = this.props;
    const { tString } = i18n;

    return (
      <View style={{ position: "relative", height: "100%" }}>
        <GraphQLGuardComponent
          tString={tString}
          dataKey="cosmosAccountHistory"
          result={cosmosAccountHistory}
          errorComponent={<DashboardError tString={tString} />}
          loadingComponent={
            <DashboardLoader
              showPortfolioLoadingMessage={displayLoadingMessage}
            />
          }
        >
          <Portfolio {...this.props} />
        </GraphQLGuardComponent>
      </View>
    );
  }

  startLoadingTimer = () => {
    const LOADING_THRESHOLD_DELAY = 3000; // 3 seconds
    this.loadingTimer = setTimeout(() => {
      this.setState({ displayLoadingMessage: true });
    }, LOADING_THRESHOLD_DELAY);
  };

  cancelLoadingTimer = () => {
    if (this.loadingTimer) {
      clearTimeout(this.loadingTimer);
    }

    this.setState({ displayLoadingMessage: false });
  };
}

class Portfolio extends React.PureComponent<IProps, IState> {
  currentWindowWidth = window.innerWidth;
  chartRef: any = null;
  throttledPortfolioCalculationFunction: () => void;
  throttledPortfolioRedrawFunction: (fullSizeChanged?: boolean) => void;

  constructor(props: IProps) {
    super(props);

    this.throttledPortfolioRedrawFunction = throttle(
      250,
      this.ridiculouslyForcePortfolioToRedraw,
    );

    this.throttledPortfolioCalculationFunction = throttle(
      250,
      this.calculatePortfolioData,
    );

    this.state = {
      portfolioChartData: null,
    };
  }

  componentDidMount() {
    this.throttledPortfolioCalculationFunction();
    window.addEventListener("resize", () =>
      this.throttledPortfolioRedrawFunction(),
    );
  }

  componentWillUnmount() {
    window.removeEventListener("resize", () =>
      this.throttledPortfolioRedrawFunction(),
    );
  }

  componentDidUpdate(prevProps: IProps) {
    // Redraw portfolio is switching back to regular size
    if (prevProps.fullSize && !this.props.fullSize) {
      this.throttledPortfolioRedrawFunction(true);
    }

    // If address data or currencySetting changed, update the portfolio data
    if (
      prevProps.cosmosAccountHistory !== this.props.cosmosAccountHistory ||
      prevProps.settings.currencySetting !== this.props.settings.currencySetting
    ) {
      this.throttledPortfolioCalculationFunction();
    }
  }

  render(): Nullable<JSX.Element> {
    if (this.state.portfolioChartData === null) {
      return null;
    }

    return this.renderChart();
  }

  renderChart = () => {
    const { i18n, settings, app, fullSize, network } = this.props;
    const { t, tString } = i18n;
    const { fiatCurrency, currencySetting, isDarkTheme } = settings;

    const chartData = this.getChartValues();

    if (chartData) {
      const noData = Object.keys(chartData.data).length === 0;

      if (noData) {
        // Get a relevant message to display for an empty portfolio graph.
        const portfolioType = app.activeChartTab;
        const getEmptyGraphMessage = (type: BASE_CHART_TABS): string => {
          switch (type) {
            case "TOTAL":
            case "AVAILABLE":
              return tString("No ATOM balance exists yet.");
            case "REWARDS":
              return tString(
                "Please note that rewards data will not start accumulating until rewards balances are 1µatom or greater.",
              );
            case "STAKING":
              return tString("No staking balance exists yet.");
            case "COMMISSIONS":
              return tString("No commissions data exists yet.");
            default:
              return assertUnreachable(type);
          }
        };

        return (
          <Centered style={{ flexDirection: "column" }}>
            <H5>{t("No data exists yet.")}</H5>
            <p style={{ textAlign: "center" }}>
              {getEmptyGraphMessage(portfolioType as BASE_CHART_TABS)}
            </p>
          </Centered>
        );
      }

      const options = getHighchartsChartOptions({
        tString,
        network,
        fullSize,
        chartData,
        isDarkTheme,
        fiatCurrency,
        currencySetting,
      });

      return (
        <View>
          <Row style={{ justifyContent: "space-between" }}>
            {this.props.settings.isDesktop && (
              <Button
                category="SECONDARY"
                data-cy="csv-download-button"
                onClick={this.handleDownloadCSV}
              >
                {t("Download CSV")}
              </Button>
            )}
            <View>
              <CurrencySettingsToggle />
            </View>
          </Row>
          <HighchartsReact
            options={options}
            highcharts={Highcharts}
            ref={this.assignChartRef}
          />
        </View>
      );
    } else {
      return null;
    }
  };

  ridiculouslyForcePortfolioToRedraw = (fullSizeChanged = false) => {
    // Only react to width changes.
    const widthResized = window.innerWidth !== this.currentWindowWidth;
    this.currentWindowWidth = window.innerWidth;

    if (widthResized || fullSizeChanged) {
      /**
       * Seemingly HighchartsReact does not redraw easily when other elements
       * change size or the window resizes. So the chart would get fixed to
       * some dimension and not change when resize events happened, even
       * though they seem to expose this "reflow" API to allow that to happen.
       *
       * So what happens here is we just set the portfolioData to null to
       * un-render the chart and then reset the data again to render the chart
       * again after an event occurs where the chart should redraw.
       */
      const { portfolioChartData } = this.state;
      this.setState(
        {
          portfolioChartData: null,
        },
        () => this.setState({ portfolioChartData }),
      );
    }
  };

  assignChartRef = (ref: any) => {
    this.chartRef = ref;
  };

  calculatePortfolioData = () => {
    const { settings, network, cosmosAccountHistory } = this.props;

    if (cosmosAccountHistory && cosmosAccountHistory.cosmosAccountHistory) {
      const {
        validatorCommissions,
      } = cosmosAccountHistory.cosmosAccountHistory;

      const portfolioType = getPortfolioTypeFromUrl(window.location.pathname);
      const onCommissionsTab = portfolioType === "COMMISSIONS";
      const noCommissionsExist = validatorCommissions.length === 0;

      /**
       * If the commissions tab is active but an address loads without commissions
       * data, redirect to the /rewards tab instead. This is actually crap
       * because it just generates a navigation side effect in the middle of
       * this function. This should be moved into an epic and handled properly,
       * but this is a little tricky because it depends on the GraphQL data
       * loading for the new address.
       */
      if (noCommissionsExist && onCommissionsTab) {
        this.props.history.push("/dashboard/rewards");
      }

      const displayFiat = settings.currencySetting === "fiat";
      const result = processPortfolioHistoryData(
        this.props.cosmosAccountHistory,
        displayFiat,
        network,
      );

      this.setState({ portfolioChartData: result });
    }
  };

  getChartValues = (): Nullable<ChartData> => {
    const { app } = this.props;
    const { portfolioChartData } = this.state;

    if (portfolioChartData) {
      const portfolioType = app.activeChartTab;
      if (portfolioType === "TOTAL") {
        return getChartTotalGraph(portfolioChartData);
      } else if (portfolioType === "AVAILABLE") {
        return portfolioChartData.availableChartData;
      } else if (portfolioType === "REWARDS") {
        return portfolioChartData.rewardsChartData;
      } else if (portfolioType === "STAKING") {
        return portfolioChartData.delegationsChartData;
      } else if (portfolioType === "COMMISSIONS") {
        return portfolioChartData.validatorRewardsChartData;
      }
    }

    return null;
  };

  handleDownloadCSV = () => {
    try {
      const { address, network, settings, cosmosAccountHistory } = this.props;
      const fiatCurrencySymbol = settings.fiatCurrency.symbol;

      // Calculate the portfolio data again, but force displayFiat to
      // false to get the crypto balances.
      const portfolioData = processPortfolioHistoryData(
        cosmosAccountHistory,
        false,
        network,
      );

      if (
        portfolioData &&
        cosmosAccountHistory &&
        cosmosAccountHistory.cosmosAccountHistory
      ) {
        const { fiatPriceHistory } = cosmosAccountHistory.cosmosAccountHistory;
        const CSV = chartExportBuilder({
          address,
          network,
          fiatPriceHistory,
          fiatCurrencySymbol,
          portfolioChartHistory: portfolioData,
        });

        // Download the CSV data
        this.props.downloadDataToFile(CSV);

        // Track download event
        Analytics.downloadCSV();
      } else {
        Toast.warn(this.props.i18n.tString("No data found..."));
      }
    } catch (err) {
      Sentry.captureException(err);
      Toast.warn(this.props.i18n.tString("Failed to download CSV data..."));
    }
  };
}

/** ===========================================================================
 * Props
 * ============================================================================
 */

const mapStateToProps = (state: ReduxStoreState) => ({
  i18n: i18nSelector(state),
  app: Modules.selectors.app.appSelector(state),
  settings: Modules.selectors.settings(state),
  network: Modules.selectors.ledger.networkSelector(state),
  address: Modules.selectors.ledger.addressSelector(state),
});

const dispatchProps = {
  updateSetting: Modules.actions.settings.updateSetting,
};

const withProps = connect(mapStateToProps, dispatchProps);

type ConnectProps = ReturnType<typeof mapStateToProps> & typeof dispatchProps;

interface ComponentProps {
  fullSize: boolean;
  downloadDataToFile: (CSV: string) => void;
}

interface IProps
  extends ComponentProps,
    ConnectProps,
    RouteComponentProps,
    GraphQLConfigProps,
    CosmosAccountHistoryProps,
    FiatPriceHistoryProps {}

/** ===========================================================================
 * Export
 * ============================================================================
 */

export default composeWithProps<ComponentProps>(
  withRouter,
  withProps,
  withGraphQLVariables,
  withFiatPriceHistory,
  withCosmosAccountHistory,
)(PortfolioLoadingContainer);
