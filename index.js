const PACKAGE = require("./package.json");
const {parse} = require("ini");
const mysql = require('mysql2/promise');
const { readFileSync, mkdirSync, existsSync, writeFileSync } = require('fs');
const extract = require("extract-zip");
const {resolve} = require('path');

const FILE = 'symmetric-server-3.12.11';
const CONFIG_FILE = resolve(`./config.ini`);

const autoincrement = (() => {
    let i = 0;
    return () => {
        return i++;
    }
})();

if (!existsSync(CONFIG_FILE)) {
    console.error('cannot find config.ini');
    process.exit(0)
}

const config = parse(readFileSync(CONFIG_FILE, 'utf-8'));

// Create temp folder
if (!existsSync('tmp'))
    mkdirSync('tmp');

// Make segment
class Segment {
    id = autoincrement();
    config = {};
    constructor(_config) {
        this.config = _config;
    }

    async create(tables, countSegment, globalConfig) {
        console.log(`[${this.config.name}] unpack zip archive`);
        await this.createTemp();
        console.log(`[${this.config.name}] create file properties`);
        this.createProperties(globalConfig);
        console.log(`[${this.config.name}] create file sql`);
        this.createSql(tables, countSegment);
        console.log(`[${this.config.name}] create help files`);
        this.createCommandFiles();
        console.log(`[${this.config.name}] ready`);
    }

    async createTemp() {
        if (!existsSync(resolve(`./tmp/${this.config.name}/`))) {
            await extract(`./resources/${FILE}.zip`, {
                dir: resolve(`./tmp/${this.config.name}/`)
            })
        }
    }

    createProperties(globalConfig) {
        let conf = readFileSync(`./resources/${this.config.master ? 'corp' : 'store'}.properties`).toString();
        const data = {
            ENGINE_BASE: this.config.masterServer ? this.config.masterServer.name : this.config.name,
            ENGINE_NAME: this.config.name,
            EXTERNAL_ID: this.id,
            PUSH_TIME: globalConfig['job.push.period.time.ms'] || 10000,
            PULL_TIME: globalConfig['job.pull.period.time.ms'] || 10000,
            DB_HOST: this.config.database.host,
            DB_NAME: this.config.database.database,
            DB_USER: this.config.database.user,
            DB_PASS: this.config.database.password,
            DB_PORT: this.config.database.port,
            SERVER_HOST: this.config.masterServer ? this.config.masterServer.host : this.config.server.host,
            SERVER_PORT: this.config.masterServer ? this.config.masterServer.port : this.config.server.port,
        };
        conf = conf.replace(/{{([A-Z_]+)}}/gi, (_, str) => {
            return data[str];
        });
        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/engines/${this.config.name}.properties`), conf);
    }

    createSql(tables, countSegment) {
        let sql = readFileSync(`./resources/insert_sample.sql`).toString();
        sql = sql.replace(/{{([A-Z_]+)}}/gi, (_, str) => {
            if (str === 'TRIGGERS') {
                return tables.map(name => {
                    return `INSERT INTO sym_trigger (trigger_id,source_table_name,channel_id,last_update_time,create_time)
                    VALUES('${name}','${name}','items',current_timestamp,current_timestamp);`
                }).join('\n\n')
            }
            if (str === 'TRIGGERS_ROUTERS') {
                return tables.map(name => {
                    return `insert into sym_trigger_router 
(trigger_id,router_id,initial_load_order,last_update_time,create_time)
values('${name}','corp_2_store', 200, current_timestamp, current_timestamp);

insert into sym_trigger_router 
(trigger_id,router_id,initial_load_order,last_update_time,create_time)
values('${name}','store_2_corp', 200, current_timestamp, current_timestamp);
`
                }).join('\n\n')
            }
            if (str === 'AUTO_INCR_INCREMENT') {
                return this.id + 1;
            }
            if (str === 'AUTO_INCR_OFFSET') {
                return countSegment;
            }
            return str;
        });
        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/engines/insert.sql`), sql);
    }

    createCommandFiles() {
        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/install.bat`), `
call ${`bin/symadmin`} --engine ${this.config.name} create-sym-tables
call ${`bin/dbimport`} --engine ${this.config.name} ${`./engines/insert.sql`}
        `);
        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/install.sh`), `#/bin/sh
${`./bin/symadmin`} --engine ${this.config.name} create-sym-tables
${`./bin/dbimport`} --engine ${this.config.name} ${`./engines/insert.sql`}
        `);

        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/start.bat`), `
call ${`bin/sym`} --engine ${this.config.name} --port ${this.config.server.port}
        `);

        writeFileSync(resolve(`./tmp/${this.config.name}/${FILE}/start.sh`), `#/bin/sh
${`./bin/sym`} --engine ${this.config.name} --port ${this.config.server.port}
        `);
    }
}

(async () => {
    console.log('VERSION:', PACKAGE.version);
    if (!config.master) {
        console.error('server master settings not found')
        process.exit()
    }
    if (Object.keys(config.master).length > 1) {
        console.error('server master cannot be more than one')
        process.exit()
    }
    if (!config.slave || Object.keys(config.slave).length === 0) {
        console.error('server slave settings not found')
        process.exit()
    }

    const [ masterServerName ] = Object.keys(config.master);

    // Valid DB config
    const dbConfigRowName = ['db.host', 'db.name', 'db.password', 'db.username'];
    const databaseConfigValid = Object.keys(config.master[masterServerName]).filter(key => {
        return dbConfigRowName.includes(key)
    }).length === dbConfigRowName.length;

    if (!databaseConfigValid) {
        console.error('not transferred all database settings');
        process.exit()
    }

    const serverList = {
        master: new Segment({
            master: true,
            name: masterServerName,
            database: {
                host: config.master[masterServerName]['db.host'],
                user: config.master[masterServerName]['db.username'],
                database: config.master[masterServerName]['db.name'],
                password: config.master[masterServerName]['db.password'].toString(),
                port: config.master[masterServerName]['db.port'] || 3306
            },
            server: {
                port: config.master[masterServerName]['server.port'] || 8080,
                host: config.master[masterServerName]['server.host'] || 'localhost'
            }
        })
    }
    const connection = await mysql.createConnection(serverList.master.config.database);
    const [rows] = await connection.execute('SHOW TABLES');
    const tables = Array.from(rows).map(e => {
        return Object.values(e)[0];
    }).filter(e => !e.includes('sym_') && !e.includes('property_table'));

    let keys = [];
    for (const key of Object.keys(config.slave)) {
        const databaseConfigValid = Object.keys(config.slave[key]).filter(key => {
            return dbConfigRowName.includes(key)
        }).length === dbConfigRowName.length;

        if (!databaseConfigValid) {
            console.error(`[${key}] not transferred all database settings`);
            process.exit()
        }

        serverList[key] = new Segment({
            master: false,
            name: key,
            database: {
                host: config.slave[key]['db.host'],
                user: config.slave[key]['db.username'],
                database: config.slave[key]['db.name'],
                password: config.slave[key]['db.password'].toString(),
                port: config.slave[key]['db.port'] || 3306
            },
            masterServer: {
                name: masterServerName,
                port: config.master[masterServerName]['server.port'] || 8080,
                host: config.master[masterServerName]['server.host'] || 'localhost'
            },
            server: {
                port: config.slave[key]['server.port'] || 8080,
                host: config.slave[key]['server.host'] || 'localhost'
            }
        })
        keys.push(key);
    }

    const countSegment = Object.keys(serverList).length;
    await serverList.master.create(tables, countSegment, config);

    for (const key of keys) {
        await serverList[key].create(tables, countSegment, config);
    }

    console.log('ready create');
    process.exit();
})();