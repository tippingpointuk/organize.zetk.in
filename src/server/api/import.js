import express from 'express';


const importApi = express();

importApi.post('/', (req, res, next) => {
    let idColumnIdx;
    let orgId = req.body.orgId;
    let rows = req.body.rows;
    let cols = req.body.columns;
    let promise;
    let tagMappings = [];

    let report = {
        num_imported: 0,
        num_created: 0,
        num_updated: 0,
        num_tagged: 0,
    };

    promise = Promise.resolve();

    // TODO: Validate org fully?
    // TODO: Validate privileges ahead of import?
    if (!orgId) {
        res.status(400).json({
            ok: false,
            error: 'Missing organization',
        });
    }

    // First, validate columns
    for (let c = 0; c < cols.length; c++) {
        let col = cols[c];

        if (col.type === 'person_data') {
            // TODO: Validate field
        }
        else if (col.type === 'person_tag') {
            // TODO: Validate tag?
        }
        else if (col.type === 'unknown') {
            // TODO: Handle when no type is given. Ignore?
        }
        else {
            return res.status(400).json({
                ok: false,
                error: 'Unknown column type ' + col.type,
            });
        }
    }


    for (let r = 0; r < rows.length; r++) {
        let row = rows[r];

        let tags = [];
        let person = {};
        let personId;

        for (let c = 0; c < cols.length; c++) {
            let col = cols[c];
            let val = row[c];

            if (col.type === 'person_data') {
                if (col.config.field == 'id') {
                    personId = row[c];
                }
                else {
                    person[col.config.field] = row[c];
                }
            }
            else if (col.type === 'person_tag') {
                let mapping = col.config.mappings.find(m => m.value === val);
                console.log('Looked for mapping', mapping);
                if (mapping) {
                    tags = tags.concat(mapping.tags);
                }
            }
        }

        // Update persons for which there are ID, or create new when there is none
        if (personId) {
            promise = promise
                .then(res => req.z.resource(
                    'orgs', orgId, 'people', personId).patch(person))
                .then(res => {
                    report.num_updated++;
                    report.num_imported++;
                    return res;
                });
        }
        else {
            promise = promise
                .then(res => req.z.resource(
                    'orgs', orgId, 'people').post(person))
                .then(res => {
                    report.num_created++;
                    report.num_imported++;
                    return res;
                });
        }

        if (tags.length) {
            promise = promise
                .then(res => {
                    let p = res.data.data;
                    return Promise.all(tags.map(tag =>
                        req.z.resource('orgs', orgId, 'people', p.id,
                            'tags', tag).put()));
                })
                .then(() => {
                    report.num_tagged++;
                });

        }
    }

    promise
        .then(() => {
            res.status(200).json({
                ok: true,
                error: null,
                report: report,
            });
        })
        .catch(err => {
            res.status(500).json({
                ok: false,
                error: err,
            });
        });

});


export default importApi;
