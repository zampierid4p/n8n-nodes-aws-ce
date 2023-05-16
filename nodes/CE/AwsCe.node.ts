import { IExecuteFunctions } from 'n8n-core';

import {
  ICredentialDataDecryptedObject,
  IDataObject,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  NodeOperationError,
} from 'n8n-workflow';

import * as AWS from 'aws-sdk';

export class AwsCe implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AWS Cost Explorer',
    name: 'awsCe',
    icon: 'file:ce.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Retrieves cost and usage information from AWS',
    defaults: {
      name: 'AWS Cost Explorer',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'aws',
        required: true,
      },
    ],
    properties: [
    	{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get cost and usage',
						value: 'getCostAndUsage',
						action: 'Retrieves cost and usage metrics for your account. You can specify which cost and usage-related metric that you want the request to return.',
					},
					{
						name: 'Get cost forecast',
						value: 'getCostForecast',
						action: 'Retrieves a forecast for how much Amazon Web Services predicts that you will spend over the forecast time period that you select, based on your past costs.',
					},
				],
				default: 'getCostAndUsage',
			},
      {
        displayName: 'Time start',
        name: 'timeStart',
        type: 'string',
        required: true,
        default: '',
        description: 'The start date for retrieving Amazon Web Services costs. Data for this date is included.',
      },
      {
        displayName: 'Time end',
        name: 'timeEnd',
        type: 'string',
        required: true,
        default: '',
        description: 'Then end date for retrieving Amazon Web Services costs. Data for this date is excluded.',
      },
      {
        displayName: 'Granularity',
        name: 'granularity',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'DAILY',
            value: 'DAILY',
            description: 'Break down costs and usage by day.',
          },
          {
            name: 'MONTHLY',
            value: 'MONTHLY',
            description: 'Break down costs and usage by month.',
          },
          {
            name: 'HOURLY',
            value: 'HOURLY',
            description: 'Break down costs and usage by hour.',
          }
        ],
        default: 'MONTHLY',
      },
      {
        displayName: ' Metrics',
        name: 'metrics',
        placeholder: 'Add Metric',
        type: 'fixedCollection',
        typeOptions: {
					multipleValues: true,
				},
        required: true,
        default: {},
        description: 'The metrics to include in the output.',
        options: [
				{
						name: "metrics",
						displayName: "Metric",
						required: true,
						values: [
							{
								displayName: "Metric",
								name: "metric",
								type: "string",
								default: "",
								description: "A metric",
							},
						],
					},
				],
      }
    ]
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

		const credentials: ICredentialDataDecryptedObject = await this.getCredentials('aws');
		const ce = new AWS.CostExplorer({
			accessKeyId: `${credentials.accessKeyId}`.trim(),
			secretAccessKey: `${credentials.secretAccessKey}`.trim(),
			region: `${credentials.region}`.trim(),
		});

    let item: INodeExecutionData;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
			  const operation = this.getNodeParameter('operation', itemIndex) as string;

				item = items[itemIndex];

        if (operation === 'getCostAndUsage') {

          const timeStart = this.getNodeParameter('timeStart', itemIndex) as string;
          const timeEnd = this.getNodeParameter('timeEnd', itemIndex) as string;
          const granularity = this.getNodeParameter('granularity', itemIndex) as string;
          const metrics = this.getNodeParameter('metrics', itemIndex, {}) as IDataObject;

          const params: AWS.CostExplorer.GetCostAndUsageRequest = {
						TimePeriod: {
						   Start: timeStart,
						   End: timeEnd,
						},
						Granularity: granularity,
            Metrics: (metrics.metrics as IDataObject[] || []).map(({ metric }) => metric as string),
          };

          const results = await ce.getCostAndUsage(params).promise();
					item.json = { ...results };

        } else if (operation == 'getCostForecast') {
          const timeStart = this.getNodeParameter('timeStart',itemIndex) as string;
          const timeEnd = this.getNodeParameter('timeEnd', itemIndex) as string;
          const granularity = this.getNodeParameter('granularity', itemIndex) as string;
          const metrics = this.getNodeParameter('metrics', itemIndex, {}) as IDataObject;
          const metric = (metrics.metrics as IDataObject[] || []).map(({ metric }) => metric as string)

          const params: AWS.CostExplorer.GetCostForecastRequest = {
						TimePeriod: {
						   Start: timeStart,
						   End: timeEnd,
						},
						Granularity: granularity,
						Metric: metric[0],
          };

          const results = await ce.getCostForecast(params).promise();
					item.json = { ...results };

        } else {
					throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported! `, {
						itemIndex,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					items.push({ json: this.getInputData(itemIndex)[0].json, error, pairedItem: itemIndex });
				} else {
					if (error.context) {
						error.context.iitemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex,
					});
				}
			}
		}

		return this.prepareOutputData(items);
	}
}
