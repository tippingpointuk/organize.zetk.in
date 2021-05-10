import { csvFormatRows } from 'd3-dsv';

import * as types from '.';


export function addPersonViewRow(viewId, personId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.ADD_PERSON_VIEW_ROW,
            meta: { viewId, personId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'rows', personId).put(),
            }
        });
    };
}

export function copyPersonView(id, copyIntl) {
    return ({ dispatch, getState, z }) => {
        // Get the current view
        const viewData = getState().personViews.viewList.items.find(v => v.data.id == id);
        // copyIntl is the internationalized name of "copy". This is not so nice,
        // but the alternative is to set up intl outside react-components
        const viewPostData = {
            title: `${viewData.data.title} (${copyIntl})`,
            description: viewData.data.description,
        }
        const columnData = getState().personViews.columnsByView[id].items;
        const columnPostData = columnData.map(c => {
            return {
                title: c.data.title,
                type: c.data.type,
                config: c.data.config,
            }
        });

        const rowData = getState().personViews.rowsByView[id].items;
        const rows = rowData.map(r => r.data.id)
        const orgId = getState().org.activeId;

        let viewRes = null;

        dispatch({
                type: types.CREATE_PERSON_VIEW,
                payload: {
                    // Copy the view
                    promise: z.resource('orgs', orgId, 'people', 'views')
                        .post(viewPostData)
                        .then(res => {
                            viewRes = res;

                            // Copy the columns
                            let promise = Promise.resolve();

                            columnPostData.forEach(colData => {
                                promise = promise.then(() =>
                                    z.resource('orgs', orgId, 'people', 'views', viewRes.data.data.id, 'columns').post(colData));
                            });

                            return promise;
                        })
                        .then(() => {
                            // Copy the rows
                            let promises = []
                            rows.forEach(personId => {
                                promises.push(
                                    z.resource('orgs', orgId, 'people',
                                        'views', viewRes.data.data.id, 'rows', personId).put()
                                )
                            })
                            return Promise.all(promises);

                            // TODO: Copy local values
                        })
                        .then(() => viewRes),
                }
            });


    };
}

export function createPersonView(data, defaultColumns=[]) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        let viewRes = null;

        dispatch({
            type: types.CREATE_PERSON_VIEW,
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views')
                    .post(data)
                    .then(res => {
                        viewRes = res;

                        // Add default columns
                        if (defaultColumns && defaultColumns.length) {
                            let promise = Promise.resolve();

                            // Create columns sequentially to guarantee order
                            defaultColumns.forEach(colData => {
                                promise = promise.then(() =>
                                    z.resource('orgs', orgId, 'people', 'views', viewRes.data.data.id, 'columns').post(colData));
                            });

                            return promise
                                .catch(err => {
                                    // Ignore errors for default columns
                                });
                        }
                    })
                    .then(() => viewRes),
            }
        });
    };
}

export function deletePersonView(viewId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.DELETE_PERSON_VIEW,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId).del(),
            }
        });
    };
}



export function createPersonViewColumn(viewId, data) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        if(data.title.length > 80) {
            data.title = data.title.substring(0,77) + '...';
        }

        dispatch({
            type: types.CREATE_PERSON_VIEW_COLUMN,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'columns').post(data),
            }
        });
    };
}

export function exportPersonView(viewId, queryId) {
    return ({ getState }) => {
        const personViews = getState().personViews;
        const columnList = personViews.columnsByView[viewId];
        let rowList = personViews.rowsByView[viewId];

        if (queryId) {
            rowList = personViews.matchesByViewAndQuery[viewId][queryId];
        }

        const rows = [];

        if (columnList && columnList.items && rowList && rowList.items) {
            // Start with the header
            rows.push(['Zetkin ID'].concat(columnList.items.map(colItem => colItem.data.title)));

            // Add all rows
            rowList.items.forEach(rowItem => {
                const data = rowItem.data;

                const content = data.content.map(item => {
                    if(item && typeof(item) == 'object') {
                        if(item instanceof Array) {
                            // Assumes text type array items
                            const arrayItems = item.map(i => {
                                if(i.text) {
                                    return i.text;
                                } else if(i.submitted) {
                                    return i.submitted;
                                }
                            });
                            return arrayItems.join("\n");
                        } else if(item.first_name && item.last_name) {
                            // Person object
                            return `${item.first_name} ${item.last_name}`;
                        }
                    }
                    else if(typeof(item) === 'boolean') {
                        return item ? 'x' : '';
                    }

                    return item;
                });

                rows.push([data.id].concat(content));
            });
        }

        // Download CSV
        const csvStr = csvFormatRows(rows);
        const blob = new Blob([ csvStr ], { type: 'text/csv' });
        const now = new Date();
        let orgName = getState().user.activeMembership.organization.title;
        orgName = orgName.toLowerCase().replace(/\s/g,'-').replace(/[^a-z\-]/g, '')
        const dateStr = now.format('%Y%m%d');
        const timeStr = now.format('%H%m%S');
        const a = document.createElement('a');
        a.setAttribute('href', URL.createObjectURL(blob));
        a.setAttribute('download', `${orgName}_${dateStr}_${timeStr}.csv`);
        a.style.display = 'none';

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);
    };
}

export function removePersonViewRow(viewId, personId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.REMOVE_PERSON_VIEW_ROW,
            meta: { viewId, personId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'rows', personId).del(),
            }
        });
    };
}

export function retrievePersonViews() {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEWS,
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views').get(),
            }
        });
    };
}

export function retrievePersonView(viewId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEW,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId).get(),
            }
        });
    };
}

export function retrievePersonViewColumns(viewId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEW_COLUMNS,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'columns').get(),
            }
        });
    };
}

export function retrievePersonViewRows(viewId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEW_ROWS,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'rows').get(),
            }
        });
    };
}

export function retrievePersonViewRow(viewId, personId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEW_ROW,
            meta: { viewId, personId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'rows', personId).get(),
            }
        });
    };
}

export function retrievePersonViewQuery(viewId, queryId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.RETRIEVE_PERSON_VIEW_QUERY,
            meta: { viewId, queryId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'queries', queryId, 'matches?view_id=' + viewId).get(),
            }
        });
    };
}

export function updatePersonView(viewId, data) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.UPDATE_PERSON_VIEW,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId).patch(data),
            }
        });
    };
}

export function updatePersonViewColumn(viewId, columnId, data) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.UPDATE_PERSON_VIEW_COLUMN,
            meta: { viewId, columnId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'columns', columnId).patch(data),
            }
        });
    };
}

export function updatePersonViewCell(viewId, rowId, columnId, value) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        const resource = z.resource('orgs', orgId, 'people', 'views', viewId, 'rows', rowId, 'cells', columnId)

        dispatch({
            type: types.UPDATE_PERSON_VIEW_CELL,
            meta: { viewId, rowId, columnId },
            payload: {
                promise: value? resource.put({ value }) : resource.del(),
            }
        });
    };
}

export function removePersonViewColumn(viewId, columnId) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;

        dispatch({
            type: types.REMOVE_PERSON_VIEW_COLUMN,
            meta: { viewId, columnId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'columns', columnId).del(),
            }
        });
    };
}

export function reorderViewColumns(viewId, order) {
    return ({ dispatch, getState, z }) => {
        const orgId = getState().org.activeId;
        const data = {
            order: order.map(id => parseInt(id)),
        };

        dispatch({
            type: types.REORDER_PERSON_VIEW_COLUMNS,
            meta: { viewId },
            payload: {
                promise: z.resource('orgs', orgId, 'people', 'views', viewId, 'column_order').patch(data),
            }
        });
    };
}
