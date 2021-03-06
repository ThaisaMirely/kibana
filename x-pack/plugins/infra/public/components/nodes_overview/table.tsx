/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiInMemoryTable, EuiToolTip } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { last } from 'lodash';
import React from 'react';
import { InfraNodeType } from '../../../server/lib/adapters/nodes';
import { createWaffleMapNode } from '../../containers/waffle/nodes_to_wafflemap';
import { InfraNode, InfraNodePath, InfraTimerangeInput } from '../../graphql/types';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../lib/lib';
import { fieldToName } from '../waffle/lib/field_to_display_name';
import { NodeContextMenu } from '../waffle/node_context_menu';

interface Props {
  nodes: InfraNode[];
  nodeType: InfraNodeType;
  options: InfraWaffleMapOptions;
  formatter: (subject: string | number) => string;
  timeRange: InfraTimerangeInput;
  intl: InjectedIntl;
  onFilter: (filter: string) => void;
}

const initialState = {
  isPopoverOpen: [] as string[],
};

type State = Readonly<typeof initialState>;

const getGroupPaths = (path: InfraNodePath[]) => {
  switch (path.length) {
    case 3:
      return path.slice(0, 2);
    case 2:
      return path.slice(0, 1);
    default:
      return [];
  }
};

export const TableView = injectI18n(
  class extends React.PureComponent<Props, State> {
    public readonly state: State = initialState;
    public render() {
      const { nodes, options, formatter, intl, timeRange, nodeType } = this.props;
      const columns = [
        {
          field: 'name',
          name: intl.formatMessage({
            id: 'xpack.infra.tableView.columnName.name',
            defaultMessage: 'Name',
          }),
          sortable: true,
          truncateText: true,
          textOnly: true,
          render: (value: string, item: { node: InfraWaffleMapNode }) => (
            <NodeContextMenu
              node={item.node}
              nodeType={nodeType}
              closePopover={this.closePopoverFor(item.node.pathId)}
              timeRange={timeRange}
              isPopoverOpen={this.state.isPopoverOpen.includes(item.node.pathId)}
              options={options}
            >
              <EuiButtonEmpty onClick={this.openPopoverFor(item.node.pathId)}>
                {value}
              </EuiButtonEmpty>
            </NodeContextMenu>
          ),
        },
        ...options.groupBy.map((grouping, index) => ({
          field: `group_${index}`,
          name: fieldToName((grouping && grouping.field) || '', intl),
          sortable: true,
          truncateText: true,
          textOnly: true,
          render: (value: string) => {
            const handleClick = () => this.props.onFilter(`${grouping.field}:"${value}"`);
            return (
              <EuiToolTip content="Set Filter">
                <EuiButtonEmpty onClick={handleClick}>{value}</EuiButtonEmpty>
              </EuiToolTip>
            );
          },
        })),
        {
          field: 'value',
          name: intl.formatMessage({
            id: 'xpack.infra.tableView.columnName.last1m',
            defaultMessage: 'Last 1m',
          }),
          sortable: true,
          truncateText: true,
          dataType: 'number',
          render: (value: number) => <span>{formatter(value)}</span>,
        },
        {
          field: 'avg',
          name: intl.formatMessage({
            id: 'xpack.infra.tableView.columnName.avg',
            defaultMessage: 'Avg',
          }),
          sortable: true,
          truncateText: true,
          dataType: 'number',
          render: (value: number) => <span>{formatter(value)}</span>,
        },
        {
          field: 'max',
          name: intl.formatMessage({
            id: 'xpack.infra.tableView.columnName.max',
            defaultMessage: 'Max',
          }),
          sortable: true,
          truncateText: true,
          dataType: 'number',
          render: (value: number) => <span>{formatter(value)}</span>,
        },
      ];
      const items = nodes.map(node => {
        const name = last(node.path);
        return {
          name: (name && name.value) || 'unknown',
          ...getGroupPaths(node.path).reduce(
            (acc, path, index) => ({
              ...acc,
              [`group_${index}`]: path.label,
            }),
            {}
          ),
          value: node.metric.value,
          avg: node.metric.avg,
          max: node.metric.max,
          node: createWaffleMapNode(node),
        };
      });
      const initialSorting = {
        sort: {
          field: 'value',
          direction: 'desc',
        },
      };
      return (
        <EuiInMemoryTable
          pagination={true}
          sorting={initialSorting}
          items={items}
          columns={columns}
        />
      );
    }

    private openPopoverFor = (id: string) => () => {
      this.setState(prevState => ({ isPopoverOpen: [...prevState.isPopoverOpen, id] }));
    };

    private closePopoverFor = (id: string) => () => {
      this.setState(prevState => ({
        isPopoverOpen: prevState.isPopoverOpen.filter(subject => subject !== id),
      }));
    };
  }
);
