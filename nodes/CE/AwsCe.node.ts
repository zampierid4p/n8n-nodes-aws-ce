import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestREST } from '../GenericFunctions';

export class AwsCe implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AWS CE',
    name: 'awsCe',
    icon: 'file:ce.svg',
    group: ['output'],
    version: 1,
    subtitle: '={{$parameter["metrics"]}}',
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

    // Get parameters.
    const timeStart = this.getNodeParameter('timeStart', 0) as string;
    const timeEnd = this.getNodeParameter('timeEnd', 0) as string;
    const granularity = this.getNodeParameter('granularity', 0) as string;
    const metrics = this.getNodeParameter('metrics', 0) as string;

    const action = 'AWSInsightsIndexService.GetCostAndUsage';

    // Create request body.
    const body: IDataObject = {
      TimePeriod : {
        Start: timeStart,
        End: timeEnd,
      },
      Granularity: granularity,
      Metrics : [ metrics ],
    };

    for (let i = 0; i < items.length; i++) {
      try {
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
