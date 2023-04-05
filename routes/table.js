const express = require('express');
const router = express.Router();

const {MongoClient} = require('mongodb');
const dayjs = require("dayjs");
const url = 'mongodb://localhost:27017';
const client = new MongoClient(url);
const dbName = 'react-admin';
const db = client.db(dbName);
const ObjectId = require('mongodb').ObjectId;

const columnsEdit = async (data) => {
    // const data = req.body;
    const collection = db.collection('ra_table');

    if (data._id === undefined) {
        data.tableName = 'ra_' + data.tableName;
        data.columns.push(
            {
                "sorter": true,
                "searchable": true,
                "isShow": true,
                "title": "创建时间",
                "type": "datetime",
                "key": "created_at",
                "editable": false,
            },
            {
                "sorter": false,
                "searchable": false,
                "isShow": false,
                "title": "删除时间",
                "type": "datetime",
                "key": "deleted_at",
                "editable": false,
            },
            {
                "sorter": true,
                "searchable": false,
                "isShow": true,
                "title": "上次更新时间",
                "type": "datetime",
                "key": "updated_at",
                "editable": false,
            },
        );

        if (data.disableable) {
            data.columns.push(
                {
                    "sorter": true,
                    "searchable": true,
                    "isShow": true,
                    "title": "启用",
                    "type": "boolean",
                    "key": "enable"
                },
            );
        }

        if (data.category) {
            await db.createCollection(data.tableName + "_category");
        }

        // data.columns.forEach(item => {
        //     if (item.type === "enum") {
        //
        //     }
        // })

        collection.insertOne(data)
            .then(() => db.createCollection(data.tableName))
            .then(res => {
                return {
                    status: true,
                    code: 0,
                    message: "新增成功"
                };
            });
    } else {
        const _id = data._id;
        delete data._id;
        collection.updateOne({_id: new ObjectId(_id)}, {$set: data})
            .then(() => collection.findOne({_id: new ObjectId(data._id)}))
            .then((res) => {
                return {
                    status: true,
                    code: 0,
                    message: "编辑成功",
                    data: res
                };
            })
    }
}


router.get('/columns/:key', function (req, response, next) {

    const tableName = 'ra_' + req.params['key'];
    const collection = db.collection('ra_table');
    collection.findOne({'tableName': tableName}).then(res => {
        response.send({
            status: true,
            code: 0,
            message: "请求完成",
            data: res
        });
    });


});

router.get('/dataSource/:key', function (req, response, next) {

    const tableName = "ra_" + req.params['key'];
    db.collection(tableName).find({"deleted_at": {$exists: false}}).sort().toArray().then(res => {
        response.send({
            status: true,
            code: 0,
            message: "请求完成",
            data: {
                pageIndex: 1,
                pageSize: 20,
                total: 100,
                data: res
            }
        });
    });


});

router.get('/list/:key', function (req, response, next) {
    const tableName = "ra_" + req.params['key'];
    db.collection(tableName).find({"deleted_at": {$exists: false}}).toArray().then(res => {
        response.send({
            status: true,
            code: 0,
            message: "请求完成",
            data: res
        });
    });


});

router.post('/columns/edit', async (req, response) => {


});

router.post('/add/:key', async (request, response) => {
    const data = request.body;

    const key = request.params['key'];
    const tableName = 'ra_' + key;


    if (key === "table") {
        response.send(columnsEdit(data));
        return;
    }


    const collection = db.collection('ra_table');
    const tableConfig = await collection.findOne({tableName});
    const columns = tableConfig.columns;

    for (let dataKey in data) {
        if (columns.find(column => column.key === dataKey)) {

        } else {
            delete data[dataKey];
        }
    }
    data['created_at'] = dayjs().format();

    let result = await db.collection(tableName).insertOne(data);
    result = await db.collection(tableName).findOne({_id: new ObjectId(result.insertedId)});
    response.send({
        status: true,
        code: 0,
        message: "请求完成",
        data: result
    });

});

router.post('/edit/:key/:id', async (request, response) => {
    const key = request.params['key'];
    const data = request.body, tableName = 'ra_' + key, id = request.params['id'];
    if (key === "table") {
        response.send(columnsEdit(data));
        return;
    }


    if (tableName === "undefined" || id === "undefined") {
        response.send({status: false, code: -1, message: "参数错误", data: null});
        return;
    }

    const collection = db.collection('ra_table');
    const tableConfig = await collection.findOne({tableName});
    const columns = tableConfig.columns;

    for (let dataKey in data) {
        columns.findIndex(column => {
            // console.log(column.key, dataKey);
        });
        if (columns.findIndex(column => column.key === dataKey) > -1) {
            // console.log(dataKey)
        } else {
            delete data[dataKey];
        }
    }
    data['updated_at'] = dayjs().format();

    console.log(tableName);
    const a = await db.collection(tableName).findOne({_id: new ObjectId(id)});
    console.log(a);

    console.log(id);
    db.collection(tableName).updateOne({_id: new ObjectId(id)}, {$set: data}).then(res => {
        console.log(res);
        return db.collection(tableName).findOne({_id: new ObjectId(id)});
    }).then(res => {
        console.log(res);
        response.send({
            status: true,
            code: 0,
            message: "请求完成",
            data: res
        });
    });
    // console.log(result);
    // result = await ;
    // console.log(result);


});

router.delete('/delete/:key/:id', async (request, response) => {
    const tableName = 'ra_' + request.params['key'];
    const id = request.params['id'];

    db.collection(tableName).updateOne({_id: new ObjectId(id)}, {$set: {deleted_at: dayjs().format()}}).then(res => {
        response.send({
            status: true,
            code: 0,
            message: "请求完成"
        });
    })


});

router.get("/group/:key", async (request, response) => {


    const tableName = "ra_" + request.params['key'];
    const parentIdField = request.query['parentIdField'] ?? "parent_id";

    // request.query.sorter
    const collection = db.collection(tableName).find();
    if (request.query.sorter) {
        collection.sort(request.query.sorter);
    }

    const menuData = await collection.toArray();

    for (let menuItem of menuData) {
        if (!menuItem.hasOwnProperty(parentIdField)) continue;
        let parent = menuData.find(item => item._id.toString() === menuItem[parentIdField]);
        if (!parent.hasOwnProperty('children')) parent.children = [];
        parent.children.push(menuItem);
    }
    const result = {
        status: true,
        code: 0,
        message: "请求完成",
        data: {
            pageIndex: 0,
            pageSize: 0,
            total: 0,
            data: menuData.filter((item) => item[parentIdField] === undefined)
        }
    };
    response.send(result);

});

router.get("/find/:key/:id", async (request, response) => {
    const tableName = "ra_" + request.params['key'];
    const id = request.params['id'];
    // const parentIdField = request.query['parentIdField'] ?? "parent_id";
    //
    // const menuData = await db.collection(tableName).find().toArray();
    //
    // for (let menuItem of menuData) {
    //     if (!menuItem.hasOwnProperty(parentIdField)) continue;
    //     let parent = menuData.find(item => item._id.toString() === menuItem[parentIdField]);
    //     if (!parent.hasOwnProperty('children')) parent.children = [];
    //     parent.children.push(menuItem);
    // }
    const data = await db.collection(tableName).findOne({_id: new ObjectId(id)});
    const result = {
        status: true,
        code: 0,
        message: "请求完成",
        data,
    };
    response.send(result);

})

module.exports = router;
