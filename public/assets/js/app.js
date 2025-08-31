Vue.prototype.$axios = axios;
Vue.prototype.$moment = moment;
Vue.prototype.$qs = Qs;
Vue.prototype._ = _;
Vue.prototype.sessionStorage = window.sessionStorage;
Vue.prototype.localStorage = window.localStorage;
Vue.prototype.console = console;

(function () {
    let urlKey = `last_url_query.${document.location.pathname}`;
    window.onbeforeunload = (e) => {
        sessionStorage.setItem(urlKey, document.location.search);
    };

    if (document.location.search !== '' || document.referrer === '') {
        return;
    }
    let last_url_query = sessionStorage.getItem(urlKey);
    window.history.replaceState(null, null, last_url_query === null ? '' : last_url_query);
}());


document.location.query = document.location.search !== '' ? Qs.parse(document.location.search.substring(1)) : {};

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

axios.interceptors.request.use(function (config) {
    if (typeof vm.loading == 'boolean') {
        vm.loading = true;
    }

    if (config.url.startsWith('/')) {
        config.url = BASE_URL + config.url;
    }

    config.url += config.url.indexOf('?') === -1 ? '?ajax' : '&ajax';

    return config;
});

axios.interceptors.response.use(function (res) {
        if (typeof vm.loading === 'boolean') {
            vm.loading = false;
        }

        if (typeof res.data === 'string') {
            vm.$alert(res.data, '服务器错误', {customClass: 'error-response'});
        }

        if (res.data.code === 0) {
            if (res.data.msg) {
                vm.$message({type: 'success', duration: 1000, message: res.data.msg});
            } else if (res.config.method !== 'get') {
                vm.$message({type: 'success', duration: 1000, message: '操作成功'});
            }
        }

        for (let name in res.headers) {
            let value = res.headers[name];
            if (value.match(/^https?:\/\//)) {
                console.warn('*'.repeat(32) + ' ' + name + ': ' + value);
            }
        }

        return res;
    },
    function (error) {
        if (typeof vm.loading == 'boolean') {
            vm.loading = false;
        }

        console.log(error);
        if (error.response.status) {
            switch (error.response.status) {
                case 400:
                    alert(error.response.data.msg);
                    break;
                case 401:
                    window.location.href = '/login';
                    break;
                default:
                    alert(error.response.data.msg || '网络错误，请稍后重试: ' + error.response.status);
                    break;
            }
        } else {
            alert('网络错误，请稍后重试。');
        }
    });

Vue.prototype.ajaxGet = function (url, data, success) {
    if (typeof data === 'function') {
        success = data;
        data = null;
    } else if (data) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + Qs.stringify(data);
    }

    let cache_key = null;
    if (success && url.match(/\bcache=[12]\b/) && localStorage.getItem('axios.cache.enabled') !== '0') {
        cache_key = 'axios.cache.' + url;
        let cache_value = sessionStorage.getItem(cache_key);
        if (cache_value) {
            success.bind(this)(JSON.parse(cache_value));
            return;
        }
    }

    return this.$axios.get(url).then((res) => {
        if (res.data.code === 0) {
            if (success) {
                if (cache_key) {
                    sessionStorage.setItem(cache_key, JSON.stringify(res.data.data));
                }
                success.bind(this)(res.data.data);
            }
        } else if (res.data.msg) {
            this.$alert(res.data.msg);
        }
        return res;
    });
};

Vue.prototype.ajaxPost = function (url, data, success) {
    if (typeof data === 'function') {
        success = data;
        data = {};
    }

    let config = {};
    if (data instanceof FormData) {
        config.headers = {'Content-Type': 'multipart/form-data'};
    }

    return this.$axios.post(url, data, config).then((res) => {
        if (res.data.code === 0 && success) {
            success.bind(this)(res.data.data);
        }

        if (res.data.msg !== '') {
            this.$alert(res.data.msg);
        }
        return res
    });
};

Vue.filter('date', function (value, format = 'YYYY-MM-DD HH:mm:ss') {
    return value ? moment(value * 1000).format(format) : '';
});

Vue.filter('json', function (value) {
    return JSON.stringify(typeof value === 'string' ? JSON.parse(value) : value, null, 2);
});

Vue.component('m-pager', {
    template: ` 
 <el-pagination background :current-page="Number($root.response.page)"
       :page-size="Number($root.request.size)"
       :page-sizes="[10,20,25,50,100,500,1000]"
       @current-change="$root.request.page=$event"
       @size-change="$root.request.size=$event; $root.request.page=1"
       :total="$root.response.count" layout="sizes,total, prev, pager, next, jumper">
</el-pagination>`,
    watch: {
        '$root.request': {
            handler() {
                for (let field in this.$root.request) {
                    if (field === 'page' || field === 'size') {
                        continue;
                    }
                    if (field in this.last && this.last[field] != this.$root.request[field]) {
                        this.$root.request.page = 1;
                        this.last = Object.assign({}, this.$root.request);
                        break;
                    }
                }
            },
            deep: true
        }
    },
    data() {
        return {
            last: Object.assign({}, this.$root.request)
        }
    }
});

Vue.component('m-date-picker', {
    props: ['value'],
    template: `
<el-date-picker v-model="time" type="daterange" 
    start-placeholder="开始日期" end-placeholder="结束日期" 
    value-format="yyyy-MM-dd" 
    size="mini"
    :picker-options="pickerOptions" @change="$emit('input', $event)">
</el-date-picker>`,
    watch: {
        value(val) {
            this.time = val;
        }
    },
    data() {
        return {
            time: this.value,
            pickerOptions: {
                shortcuts: [
                    {
                        text: '今天',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime());
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '昨天',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24);
                            end.setDate(end.getDate() - 1);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '最近三天',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24 * 3);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '最近一周',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '最近一个月',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '最近三个月',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24 * 90);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '最近一年',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setTime(start.getTime() - 3600 * 1000 * 24 * 365);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '本周',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setDate(start.getDate() - start.getDay() + 1);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '本月',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setDate(1);
                            picker.$emit('pick', [start, end]);
                        }
                    },
                    {
                        text: '本季',
                        onClick(picker) {
                            let end = new Date();
                            let start = new Date();
                            start.setMonth(parseInt(start.getMonth() / 3) * 3);
                            start.setDate(1);
                            picker.$emit('pick', [start, end]);
                        }
                    }
                ]
            }
        }
    }
});

Vue.component('m-menu', {
    template: `
<el-menu :default-active="active" class="el-menu-vertical-demo" :unique-opened="true">
    <template v-for="group in groups">
        <el-submenu :index="group.group_name">
            <template slot="title">
                <i :class="group.icon"></i>
                <span>{{group.group_name}}</span>
            </template>
            <template v-for="item in group.items ">
                <el-menu-item :index="baseURL+item.url" @click="click(item)"><i :class="item.icon" ></i>
                    <el-link :href="baseURL+item.url">{{item.item_name}}</el-link>
                </el-menu-item>
            </template>
        </el-submenu>
     </template>
</el-menu>`,
    created() {
        this.ajaxGet('/menu/my/index?cache=2', (res) => {
            this.groups = res;

            for (let group of res) {
                for (let item of group.items) {
                    if (item.url === this.active) {
                        document.title = ' ' + group.group_name + ' - ' + item.item_name;
                        break;
                    }
                }
            }
        })
    },
    data() {
        return {
            baseURL: window.BASE_URL,
            active: location.pathname,
            groups: []
        }
    },
    methods: {
        click(item) {
            let tabs = sessionStorage.getItem('.my-menu-tabs');
            tabs = tabs ? JSON.parse(tabs) : {};

            tabs[item.url] = {name: item.item_name, url: item.url};
            sessionStorage.setItem('.my-menu-tabs', JSON.stringify(tabs));
        }
    }
});

Vue.component('my-menu-tabs', {
    template: `
<el-tabs  @tab-remove="remove" @tab-click="click" class="my-menu-tabs" v-model="tab">
    <el-tab-pane label="首页" name="/"></el-tab-pane>
    <el-tab-pane v-for="tab in tabs" :label="tab.name" closable :name="tab.url" :key="tab.url"></el-tab-pane>     
</el-tabs>`,
    data() {
        let tabs = sessionStorage.getItem('.my-menu-tabs');
        tabs = tabs ? JSON.parse(tabs) : {};

        return {
            tabs: tabs,
            tab: location.pathname.substring(window.BASE_URL.length)
        }
    },
    methods: {
        remove(name) {
            let tabs = JSON.parse(sessionStorage.getItem('.my-menu-tabs'));
            delete tabs[name];
            this.$delete(this.tabs, name);
            sessionStorage.setItem('.my-menu-tabs', JSON.stringify(tabs));
        },

        click(tab) {
            let url = '';
            if (tab.name !== '/') {
                let tabs = JSON.parse(sessionStorage.getItem('.my-menu-tabs'));
                url = tabs[tab.name].url;
            }
            console.log(url)
            window.location.href = window.BASE_URL + url;
        }
    }
});

Vue.component('m-axios-cache-switcher', {
    template: `
<div>
    <div v-if="enabled" @click="localStorage.setItem('axios.cache.enabled','0');enabled=false">缓存 (√)</div>
    <div v-else @click="localStorage.setItem('axios.cache.enabled','1');enabled=true">缓存 (×)</div>
</div>`,
    data() {
        return {
            enabled: localStorage.getItem('axios.cache.enabled') !== '0'
        }
    }
});

Vue.component('m-system-time', {
    template: '<span class="left" :title="diff" :style="{backgroundColor: bgColor}" style="cursor:pointer"" v-show="diff!==null&&time!==null" @click="update">{{time}}</span>',
    data() {
        return {
            diff: null,
            time: null,
            key: 'system-time.diff'
        }
    },
    computed: {
        bgColor() {
            return Math.abs(this.diff) >= 1 ? 'red' : 'parent';
        }
    },
    created() {
        this.update();
        setInterval(() => {
            if (this.diff !== null) {
                this.time = (moment().subtract(this.diff, 'seconds').format('YYYY-MM-DD hh:mm:ss'))
            }
        }, 1000);
    },
    methods: {
        update() {
            axios.get('/time/current?t=' + Date.now()).then((res) => {
                if (res.data.code === 0) {
                    this.diff = Math.round(Date.now() - res.data.data.timestamp * 1000) / 1000;
                }
            });
        }
    }
});

Vue.component('mb-create', {
    template: `<el-button @click="$root.createVisible=true;$emit('click');" type="primary" icon="el-icon-plus" size="mini">{{$root.topic}}</el-button>`
});

Vue.component('mb-edit', {
    props: ['row', 'disabled'],
    template: `<el-button @click="$root.show_edit(row);$emit('click')" size="mini" type="primary" icon="el-icon-edit" title="编辑" :disabled="disabled"></el-button>`
});

Vue.component('mb-delete', {
    props: ['row'],
    template: '<el-button @click="do_delete(row)" size="mini" type="danger" icon="el-icon-delete" title="删除"></el-button>',
    methods: {
        do_delete(row, name = '') {
            let keys = Object.keys(row);
            let key = keys[0];

            if (!name) {
                name = (keys[1] && keys[1].indexOf('_name')) ? row[keys[1]] : row[key];
            }

            if (window.event.ctrlKey) {
                this.ajaxPost("delete", {[key]: row[key]}, () => this.$root.reload());
            } else {
                this.$confirm('确认删除 `' + (name ? name : row[key]) + '` ?').then(() => {
                    this.ajaxPost("delete", {[key]: row[key]}, () => this.$root.reload());
                });
            }
        }
    }
});

Vue.component('mb-detail', {
    props: ['row', 'link'],
    template: '<el-button @click="show_detail(row,link)" size="mini" type="info" icon="el-icon-more" title="详情"></el-button>',
    methods: {
        show_detail(row, action) {
            this.$root.detailVisible = true;

            let key = Object.keys(row)[0];
            this.ajaxGet((action ? action : "detail"), {[key]: row[key]}, (res) => {
                this.$root.detail = res;
            });
        }
    }
});

Vue.component('mb-enable', {
    props: ['row'],
    template: `
<el-button v-if="row.enabled" @click.native.prevent="do_disable(row)" size="mini" type="danger" icon="el-icon-lock" title="禁用"></el-button>
<el-button v-else @click.native.prevent="do_enable(row)" size="mini" type="warning" icon="el-icon-unlock" title="启用"></el-button>`,
    methods: {
        do_enable(row) {
            let key = Object.keys(row)[0];
            this.ajaxPost("enable", {[key]: row[key]}, () => row.enabled = 1);
        },
        do_disable(row) {
            let key = Object.keys(row)[0];
            this.ajaxPost("disable", {[key]: row[key]}, () => row.enabled = 0);
        }
    }
});

Vue.component('m-table', {
    provide() {
        return {
            parentTag: 'm-table',
            mode: '',
        }
    },
    props: ['data'],
    template: `
<div class="m-table">
    <el-table v-if="data" :data="data" border size="mini">
        <slot></slot>
    </el-table>
    <template v-else-if="$root.request.page">
        <m-pager></m-pager>
        <el-table :data="$root.response.items" border size="mini">
            <slot></slot>
        </el-table>
        <m-pager></m-pager>
    </template>
    <el-table v-else :data="$root.response" border size="mini">
        <slot></slot>
    </el-table>
</div>`,
});

Vue.component('m-selector', {
    props: ['value', 'data', 'disabled'],
    template: `
<span>
    <el-select :value="value2" size="mini" clearable style="width: 150px" @change="$emit('input', $event)" :disabled="disabled" v-bind="$attrs">
        <el-option v-for="item in items" :key="item.value" :label="item.label" :value="item.value"></el-option>
    </el-select>
</span>`,
    computed: {
        value2() {
            // noinspection EqualityComparisonWithCoercionJS
            let item = this.items.find(option => option.value == this.value);
            return item ? item.value : null;
        },
        items() {
            if (Array.isArray(this.data)) {
                if (typeof this.data[0] === 'object') {
                    return this.data.map(v => {
                        let [value, label] = Object.values(v);
                        return {value, label};
                    });
                } else {
                    return this.data.map(v => ({value: v, label: v}));
                }
            } else if (typeof this.data === 'object') {
                let items = [];
                for (let key in this.data) {
                    items.push({value: key, label: this.data[key]});
                }
                return items;
            }
        }
    }
});

Vue.component('m-navbar', {
    provide() {
        return {
            parentTag: 'm-navbar',
            mode: this.mode,
        }
    },
    props: ['mode'],
    template: `
<div class="m-navbar" mode=""><slot></slot></div>`,
});

Vue.component('m-date', {
    props: ['prop'],
    template: `<span><slot></slot><m-date-picker v-model.trim="$root.request[prop]"></m-date-picker></span>`
});

Vue.component('m-dialog', {
    provide() {
        return {
            parentTag: 'm-dialog',
            mode: this.mode,
        }
    },
    props: ['mode'],
    template: `
<div>
<el-dialog v-if="mode==='create'" :title="'新增-'+$root.topic" :visible.sync="$root.createVisible" class="create-dialog" @open="focusFirstInput" @opened="$root.$refs.create=$refs.create">
    <el-form :model="$root.create" ref="create" size="small">
        <slot></slot>
    </el-form>
    <span slot="footer">
         <el-button type="primary" @click="do_create" size="small">创建</el-button>
        <el-button @click="$root.createVisible = false; $root.$refs.create.resetFields()" size="small">取消</el-button>
    </span>
</el-dialog>
<el-dialog v-if="mode==='edit'" :title="'编辑-'+$root.topic" :visible.sync="$root.editVisible" class="edit-dialog" @open="focusFirstInput" @opened="$root.$refs.edit=$refs.edit">
     <el-form :model="$root.edit" ref="edit" size="small">
        <slot></slot>
    </el-form>
    <span slot="footer">
        <el-button type="primary" @click="do_edit" size="small">保存</el-button>
        <el-button @click="$root.editVisible=false" size="small">取消</el-button>
    </span>
</el-dialog>
<el-dialog v-if="mode==='detail'" title="详情" :visible.sync="$root.detailVisible" class="detail-dialog" @open="focusFirstInput" @opened="$root.$refs.detail=$refs.detail">
    <el-form :model="$root.detail" ref="detail" label-width="150px" size="mini">
        <slot></slot>
    </el-form>
</el-dialog>
</div>`,
    methods: {
        do_create(create) {
            let success = true;

            if (typeof create === 'string') {
                this.$root.$refs[create].validate(valid => success = valid);
            }
            success && this.ajaxPost("create", this.$root.create, (res) => {
                this.$root.createVisible = false;
                this.$root.$refs.create.resetFields();
                this.$root.reload();
            });
        },
        do_edit() {
            this.ajaxPost("edit", this.$root.edit, () => {
                this.$root.editVisible = false;
                this.$root.reload();
            });
        },
        beforeCreate() {
            this.$root.hasDetail = true;
        },
        focusFirstInput() {
            this.$nextTick(() => {
                const firstInput = this.$el.querySelector('input, textarea, [contenteditable]');
                if (firstInput) {
                    firstInput.focus();
                }
            });
        }
    }
});

Vue.component('m-text', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'disabled', 'width', 'placeholder', 'title', 'prefix', 'suffix'],
    template: `
<el-input v-if="parentTag==='m-navbar'" v-model.trim="$root.request[prop]"
    size="mini" clearable 
    :style="{width: (width||150)+'px'}"
    :placeholder="placeholder||$root.label[prop]||prop"
    v-bind="$attrs">
</el-input>
<el-table-column v-else-if="parentTag==='m-table'" :prop="prop" :label="label||$root.label[prop]||prop" v-bind="$attrs" :width="width" v-slot="{row}">
    <slot :row="row"><span :title="title?row[title]:''">{{prefix}}{{$attrs['formatter']?$attrs['formatter'](row, prop, getProp(row,prop)):getProp(row,prop)}}{{suffix}}</span></slot>
</el-table-column>
<el-form-item v-else-if="mode==='detail'" :label="(label||$root.label[prop]||prop)+':'">{{ $root.detail[prop]}}</el-form-item>
 <el-form-item v-else :label="(label||$root.label[prop]||prop)+':'" :prop="prop">
     <el-input v-model="$root[mode][prop]" auto-complete="off" :disabled="disabled" @change="$emit('input', $event)"></el-input>
 </el-form-item>`
});

Vue.component('m-textarea', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'rows', 'disabled'],
    template: `
<el-form-item :label="(label||$root.label[prop]||prop)+':'" :prop="prop">
    <el-input v-model="$root[mode][prop]" auto-complete="off" type="textarea" :rows="rows" :disabled="disabled" @change="$emit('input', $event)"></el-input>
</el-form-item>`
});

Vue.component('m-checkbox', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'disabled'],
    template: `
<el-form-item :label="(label||$root.label[prop]||prop)+':'" :prop="prop">
    <el-checkbox v-model="$root[mode][prop]" :disabled="disabled"><slot></slot></el-checkbox>
</el-form-item>`
});

Vue.component('m-radio', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'data', 'disabled'],
    computed: {
        radios() {
            return this.isString(this.data) ? this.$root[this.data] : this.data;
        }
    },
    template: `
<el-form-item :label="(label||$root.label[prop]||prop)+':'" :prop="prop">
    <el-radio-group v-model="$root[mode][prop]" :disabled="disabled">
        <el-radio v-for="(status, id) in radios" :label="id" :key="id">{{status}}</el-radio>
    </el-radio-group>
</el-form-item>`
});

Vue.component('m-select', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'data', 'disabled'],
    template: `
<m-selector v-if="parentTag==='m-navbar'" v-model.trim="$root.request[prop]" :data="isString(data)?$root[data]:data"></m-selector>
<el-form-item v-else :label="(label||$root.label[prop]||prop)+':'">
    <m-selector v-model="$root[mode][prop]" :data="isString(data)?$root[data]:data" :disabled="disabled" v-bind="$attrs"></m-selector>
</el-form-item>`
});

Vue.component('m-switch', {
    inject: ['parentTag', 'mode'],
    props: ['label', 'prop', 'disabled'],
    template: `
<el-form-item :label="(label||$root.label[prop]||prop)+':'">
    <el-switch v-model="$root[mode][prop]" :disabled="disabled"></el-switch>
</el-form-item>`
});

Vue.component('m-timestamp', {
    inject: ['parentTag'],
    props: ['label', 'prop', 'disabled'],
    template: `
<el-table-column v-if="parentTag==='m-table'" :prop="prop" :label="label||$root.label[prop]||prop" :formatter="formatDate" width="123"></el-table-column>
<el-form-item v-else :label="(label||$root.label[prop]||prop)+':'">{{ $root.detail[prop]|date}}</el-form-item>`,
    methods: {
        formatDate(row, column, value) {
            return value ? this.$moment(value * 1000).format('YYYY-MM-DD HH:mm:ss') : '';
        }
    }
});

Vue.component('m-time', {
    inject: ['parentTag'],
    props: ['label', 'prop', 'disabled'],
    template: `
<el-table-column v-if="parentTag==='m-table'" :prop="prop" :label="label||$root.label[prop]||prop" :formatter="formatDate" width="80"></el-table-column>
<el-form-item v-else :label="(label||$root.label[prop]||prop)+':'">{{ $root.detail[prop]|date}}</el-form-item>`,
    methods: {
        formatDate(row, column, value) {
            return value ? this.$moment(value * 1000).format('MM-DD HH:mm') : '';
        }
    }
});

Vue.component('m-json', {
    props: ['label', 'prop', 'disabled'],
    template: `<el-form-item :label="(label||$root.label[prop]||prop)+':'"><pre>{{ $root.detail[prop]|json}}</pre></el-form-item>`
});

Vue.component('m-index', {
    template: `<el-table-column type="index" label="#" width="50"></el-table-column>`
});

Vue.component('m-id', {
    props: ['label', 'prop'],
    template: `<el-table-column :prop="prop" :label="label||$root.label[prop]||prop" width="100"></el-table-column>`
});

Vue.component('m-account', {
    props: ['label', 'prop'],
    template: `<el-table-column :prop="prop" :label="label||$root.label[prop]||prop" width="100"></el-table-column>`
});

Vue.component('m-email', {
    template: `<el-table-column prop="email" label="邮箱" with="250" show-overflow-tooltip></el-table-column>`
});

Vue.component('m-ip', {
    props: ['label', 'prop'],
    template: `
<el-table-column :prop="prop" :label="label||$root.label[prop]||prop" width="120" v-slot="{row}">
    <span v-if="row[prop]==='127.0.0.1'||row[prop]==='::1'||row[prop].startsWith('192.168.')">{{row[prop]}}</span>
    <a v-else target="_blank" class="el-link" :href="'https://www.baidu.com/s?wd='+row[prop]" type="primary">{{row[prop]}}</a>
</el-table-column>`
});

Vue.component('m-enabled', {
    template: `<el-table-column prop="enabled" :formatter="formatEnabled" label="状态" width="100"></el-table-column>`,
    methods: {
        formatEnabled(row, column, value) {
            return ['禁用', '启用'][value];
        }
    }
});

Vue.component('m-pct100', {
    props: ['label', 'prop', 'title'], template: `
<el-table-column :prop="prop" :label="label||$root.label[prop]||prop" v-bind="$attrs" v-slot="{row}" width="60">
    <slot :row="row"><span :title="title?row[title]:''" :style="{color:getProp(row,prop)>0?'red':'green'}">{{$attrs['formatter']?$attrs['formatter'](row, prop, getProp(row,prop)):getProp(row,prop)}}%</span></slot>
</el-table-column>`
});

Vue.component('m-tag', {
    props: ['label', 'prop'],
    template: `
<el-table-column :label="label||$root.label[prop]||prop" v-bind="$attrs" v-slot="{row}">
    <el-tag size="mini" v-for="item in extractItems(row[prop])" :key="item.id">{{item.label}}</el-tag>
</el-table-column>`,
    methods: {
        extractItems(data) {
            if (!Array.isArray(data)) {
                return [];
            } else if (!data || data.length === 0) {
                return [];
            } else if (typeof data[0] === 'object') {
                return data.map(v => {
                    let [id, label] = Object.values(v);
                    return {id, label};
                });
            } else {
                return data.map(v => ({id: v, label: v}));
            }
        }
    }
});

Vue.component('m-link', {
    props: ['label', 'prop', 'href'],
    template: `
<el-table-column :label="label||$root.label[prop]||prop" width="100" v-slot="{row}">
    <a :href="href+(href.includes('?')?'&':'?')+prop+'='+row[prop]"><slot>{{row[prop]}}</slot></a>
</el-table-column>`
});

Vue.component('m-ops', {
    props: ['ops'],
    computed: {
        items() {
            return this.ops.split(',').map(op => op.trim())
        },
    }
    ,
    template: `
<el-table-column fixed="right" label="操作" v-bind="$attrs" v-slot="{row}" :width="(items.length*60)+'px'">
    <span style="display: inline-block; text-align: center; width: 100%;">
    <template v-if="ops" v-for="op in items">
        <component :is="'mb-'+op" :row="row"></component>
    </template>
     <slot :row="row"></slot>
     </span>
</el-table-column>`
})
;

Vue.component('m-button', {
    template: `<el-button size="mini" v-bind="$attrs" @click="$emit('click')"><slot></slot></el-button>`
});

Vue.component('m-my-menu', {
    template: `
     <el-dropdown-menu slot="dropdown" trigger="click">
                        <el-dropdown-item>
                            <m-axios-cache-switcher></m-axios-cache-switcher>
                        </el-dropdown-item>
                        <el-dropdown-item>
                            <el-link :href="BASE_URL+'/admin/login-log/latest'" target="_self">最近登录</el-link>
                        </el-dropdown-item>
                        <el-dropdown-item>
                            <el-link :href="BASE_URL+'/admin/action-log/latest'" target="_self">最近操作</el-link>
                        </el-dropdown-item>
                        <el-dropdown-item>
                            <el-link :href="BASE_URL+'/admin/password/change'" target="_self">修改密码</el-link>
                        </el-dropdown-item>
                        <el-dropdown-item>
                            <el-link :href="BASE_URL+'/admin/session/logout'" target="_self">退出</el-link>
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </el-dropdown>`
});

Vue.prototype.auto_reload = function () {
    if (this.request && this.response) {
        let qs = this.$qs.parse(document.location.query);
        for (let k in qs) {
            this.$set(this.request, k, qs[k]);
        }

        this.reload().then(() => this.$watch('request', _.debounce(() => this.reload(), 500), {deep: true}));
    }
};

Vue.prototype.isString = function (v) {
    return typeof v === 'string';
}

Vue.prototype.getProp = function (row, prop) {
    if (prop === undefined) {
        return '';
    }
    let v = row;
    for (let part of prop.split('.')) {
        if (v === null) {
            return ''
        }
        if (!v.hasOwnProperty(part)) {
            return '';
        }
        v = v[part];
    }

    return v;
}

App = Vue.extend({
    data() {
        return {
            topic: '',
            label: {
                id: 'ID',
                admin_id: '用户ID',
                admin_name: '用户名',
                created_time: '创建时间',
                updated_time: '更新时间',
                creator_name: '创建者',
                updator_name: '更新者',
                data: '数据',
                client_ip: '客户端IP',
                display_order: '排序',
                display_name: '显示名称',
                password: '密码',
                white_ip: 'IP白名单',
                status: '状态',
                email: '邮箱',
                tag: 'Tag',
                icon: '图标',
                path: '路径',
                builtin: '内置',
                enabled: "启用",
                type: '类别',
            },
            createVisible: false,
            editVisible: false,
            detailVisible: false,
            detail: {},
        }
    },
    methods: {
        reload() {
            if (!this.request || !this.response) {
                alert('bad reload');
            }

            let qs = this.$qs.stringify(this.request);
            window.history.replaceState(null, null, qs ? ('?' + qs) : '');
            document.location.query = document.location.search !== '' ? Qs.parse(document.location.search.substring(1)) : {};

            if (Array.isArray(this.response)) {
                this.response = [];
            }

            return this.$axios.get(document.location.href).then((res) => {
                if (res.data.code !== 0) {
                    this.$alert(res.data.msg);
                } else {
                    this.response = res.data.data;
                }
            });
        },
        show_edit(row, overwrite = {}) {
            if (Object.keys(this.edit).length === 0) {
                this.edit = Object.assign({}, row, overwrite);
            } else {
                for (let key in this.edit) {
                    if (row.hasOwnProperty(key)) {
                        this.edit[key] = row[key];
                    }
                }
                for (let key in overwrite) {
                    this.edit[key] = overwrite[key]
                }
            }

            this.editVisible = true;
        }
    },
});
