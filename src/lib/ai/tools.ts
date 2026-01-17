import { SchemaType } from '@google/generative-ai'

// AI Tools for database and website modification
// Using proper SchemaType enum values from the SDK
export const AI_TOOLS = [
    {
        name: 'createTab',
        description: 'Create a new tab/sheet in the workspace',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: 'Name of the new tab' }
            },
            required: ['name']
        }
    },
    {
        name: 'deleteTab',
        description: 'Delete a tab from the workspace',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                tabId: { type: SchemaType.STRING, description: 'ID of the tab to delete' }
            },
            required: ['tabId']
        }
    },
    {
        name: 'addColumn',
        description: 'Add a new column to a sheet',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                sheetId: { type: SchemaType.STRING, description: 'ID of the sheet' },
                name: { type: SchemaType.STRING, description: 'Column name' },
                columnType: { type: SchemaType.STRING, description: 'Column data type: text, number, date, boolean, select' }
            },
            required: ['sheetId', 'name', 'columnType']
        }
    },
    {
        name: 'addRow',
        description: 'Add a new row to a sheet with data',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                sheetId: { type: SchemaType.STRING, description: 'ID of the sheet' },
                data: { type: SchemaType.STRING, description: 'Row data as JSON string' }
            },
            required: ['sheetId', 'data']
        }
    },
    {
        name: 'updateCell',
        description: 'Update a cell value',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                sheetId: { type: SchemaType.STRING, description: 'ID of the sheet' },
                rowId: { type: SchemaType.STRING, description: 'ID of the row' },
                columnId: { type: SchemaType.STRING, description: 'ID of the column' },
                value: { type: SchemaType.STRING, description: 'New value for the cell' }
            },
            required: ['sheetId', 'rowId', 'columnId', 'value']
        }
    },
    {
        name: 'queryDatabase',
        description: 'Query data from the database (customers, orders, or couriers)',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                collection: { type: SchemaType.STRING, description: 'Collection: customers, orders, or couriers' },
                filters: { type: SchemaType.STRING, description: 'Filter conditions as JSON' },
                maxResults: { type: SchemaType.INTEGER, description: 'Max results to return' }
            },
            required: ['collection']
        }
    },
    {
        name: 'createCustomer',
        description: 'Create a new customer record',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                name: { type: SchemaType.STRING, description: 'Customer name' },
                phone: { type: SchemaType.STRING, description: 'Phone number' },
                address: { type: SchemaType.STRING, description: 'Address' },
                calories: { type: SchemaType.INTEGER, description: 'Daily calorie target' }
            },
            required: ['name', 'phone']
        }
    },
    {
        name: 'createOrder',
        description: 'Create a new order',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                customerId: { type: SchemaType.STRING, description: 'Customer ID' },
                deliveryAddress: { type: SchemaType.STRING, description: 'Delivery address' },
                deliveryTime: { type: SchemaType.STRING, description: 'Delivery time' },
                quantity: { type: SchemaType.INTEGER, description: 'Order quantity' },
                calories: { type: SchemaType.INTEGER, description: 'Order calories' }
            },
            required: ['customerId', 'deliveryAddress']
        }
    },
    {
        name: 'updateWebsite',
        description: 'Update website content or settings',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                websiteId: { type: SchemaType.STRING, description: 'Website ID' },
                updates: { type: SchemaType.STRING, description: 'Updates as JSON (content, theme, chatEnabled, etc.)' }
            },
            required: ['websiteId', 'updates']
        }
    },
    {
        name: 'generateWebsiteSection',
        description: 'Generate a new section for the website',
        parameters: {
            type: SchemaType.OBJECT,
            properties: {
                sectionType: { type: SchemaType.STRING, description: 'Section type: hero, features, pricing, about, contact, faq' },
                language: { type: SchemaType.STRING, description: 'Language: uz, ru, en' },
                context: { type: SchemaType.STRING, description: 'Additional context for generation' }
            },
            required: ['sectionType', 'language']
        }
    }
]

export const GEMINI_TOOLS = [
    { functionDeclarations: AI_TOOLS }
]
