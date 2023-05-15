import type {
  IDataObject,
  IExecuteFunctions,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodeParameters,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { URL } from 'url';

import { awsApiRequestSOAP } from '../GenericFunctions';

import { pascalCase } from 'change-case';

export class AwsSqs implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AWS CE',
    name: 'awsCe',
    icon: 'file:ce.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["operation"]}}',
    description: 'Retrieves cost and usage information from AWS',
    defaults: {
      name: 'AWS CE',
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
        name: 'granulatiry',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'DAILY,
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
        ]
        default: 'MONTHLY',
      },
      {
        displayName: ' Metrics',
        name: 'metrics',
        type: 'string',
        required: true,
        default: '',
        description: 'The metrics to include in the output.',
      }
    ]
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: IDataObject[] = [];
    let responseData;
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);
    for (let i = 0; i < items.length; i++) {
      try {
        // Get parameters.
        const timeStart = this.getNodeParameter('timeStart', i) as string;
        const timeStart = this.getNodeParameter('timeEnd', i) as string;
        const granularity = this.getNodeParameter('granularity', i) as string;
        const metrics = this.getNodeParameter('metrics', i) as string;

        // Create request body.
        const body: IDataObject = {
          TimePeriod : {
            Start: timeStart,
            End: timeEnd,
          },
          Granularity: granularity,
          Metrics : [ metrics ],
        };

        const action = 'AWSInsightsIndexService.GetCostAndUsage';
        responseData = await awsApiRequestREST.call(
          this,
          'ce',
          'POST',
          '',
          JSON.stringify(body),
          { 'x-amz-target': action, 'Content-Type': 'application/x-amz-json-1.1' },
        );

        if (Array.isArray(responseData)) {
          returnData.push.apply(returnData, responseData as IDataObject[]);
        } else {
          returnData.push(responseData as IDataObject);
        }
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({ error: error.message });
          continue;
        }
        throw error;
      }
    }
    return [this.helpers.returnJsonArray(returnData)];
  }
}
