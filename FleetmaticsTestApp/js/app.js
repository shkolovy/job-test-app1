var pageHelper = {
    HIDE_PAGE_TIME: 400,
    SHOW_PAGE_TIME: 100,
    goToPage: function (from, to) {
        var that = this;
        that.loading.show();
        $('#' + from).fadeOut(that.HIDE_PAGE_TIME, function () {
            that.loading.hide();
            $('#' + to).fadeIn(that.SHOW_PAGE_TIME);
        });
    },
    loading: {
        show: function () {
            $('#loading').show();
        },
        hide: function () {
            $('#loading').hide();
        }
    }
};

function Paging(pages, itemsOnPage) {
    "use strict";
    this.itemsOnPage = itemsOnPage;
    this.currentPage = 0;
    this.pages = pages;
}

Paging.prototype = {
    getPagedModel: function (model) {
        return model.slice(this.itemsOnPage * this.currentPage, this.itemsOnPage * this.currentPage + this.itemsOnPage);
    }
};

//make mustache
_.templateSettings = {
    evaluate: /\{\[([\s\S]+?)\]\}/g,
    interpolate: /\{\{([\s\S]+?)\}\}/g
};

/*Models*/

var Item = Backbone.Model.extend({});
var AppModel = Backbone.Model.extend({});


/*Collections*/

var Items = Backbone.Collection.extend({
    model: Item,
    desc: true,
    sortBy: 'display_title',
    comparator: function (a, b) {
        var r = a.get('content').resource[this.sortBy].localeCompare(b.get('content').resource[this.sortBy]);

        if (this.desc == true) return r;
        return -r;
    },
});


/*Views*/

var ItemView = Backbone.View.extend({
    el: '#itemPage',
    events: {
        'click #goToSearchBtn': 'goToSearchPage',
    },
    render: function () {
        this.$el.html(_.template($('#itemTemplate').html(), { item: this.model.toJSON() }));

        return this;
    },
    initialize: function () {
        this.render();
    },
    goToSearchPage: function () {
        pageHelper.goToPage('itemPage', 'searchPage');
    }
});

var GridItemsView = Backbone.View.extend({
    ITEMS_ON_PAGE: 5,
    el: '#searchResultContainer',
    events: {
        'click .title': 'goToItemPage',
        'click .more': 'displayDetails',
        'click th a': 'sort',
        'click #nextPage': 'nextPage',
        'click #previousPage': 'previousPage'
    },
    sort: function (e) {
        var $e = $(e.target);

        this.model.desc = $e.data('desc');
        this.model.sortBy = $e.data('sortby');

        this.model.sort();
        this.render();
    },
    render: function () {
        var that = this,
            regEx = new RegExp('(' + that.model.searchStr + ')', 'ig');

        that.$el = $('#searchResultContainer');

        that.$el.html(_.template($('#itemGridTemplate').html(), {
            items: that.paging.getPagedModel(that.model.toJSON()),
            sortBy: that.model.sortBy,
            desc: !that.model.desc,
            itemsCount: that.model.length
        }));

        $.each(that.$el.find('.title'), function (i, el) {
            var $el = $(el);
            $el.html($el.text().replace(regEx, '<span class="text-highlight">' + that.model.searchStr + '</span>'));
        });

        that.pagerPrepare();

        //to avoid event dublication on re-rendering
        that.$el.undelegate();
        that.delegateEvents();

        return this;
    },
    initialize: function () {
        var that = this;
        this.model.forEach(function (item) {
            item.set({
                id: item.attributes.content.resource.id,
                media_type_css: that.getMediaTypeCss(item.attributes.content.resource.media_type)
            });
        });

        that.paging = new Paging(this.model.length / that.ITEMS_ON_PAGE, that.ITEMS_ON_PAGE);

        that.render();
    },
    getMediaTypeCss: function (mp) {
        switch (mp) {
            case 'html':
                return 'glyphicon-globe';
            case 'flash':
                return 'glyphicon-film';
            default:
                return 'glyphicon-list-alt';
        }
    },
    goToItemPage: function (e) {
        this.displayItemPage(this.getId(e.target));
    },
    getId: function (target) {
        return $(target).parents('tr').data('id');
    },
    displayItemPage: function (id) {
        var model = this.model.get(id);
        new ItemView({ model: model });
        pageHelper.goToPage('searchPage', 'itemPage');
    },
    displayDetails: function (e) {
        alert('details: ' + this.getId(e.target));
    },
    paging: {
    },
    pagerPrepare: function () {
        this.$el.find('#pager').toggleClass('hidden', this.model.length < this.paging.ITEMS_ON_PAGE);
        this.$el.find('#nextPage').prop('disabled', this.paging.currentPage + 1 >= this.paging.pages);
        this.$el.find('#previousPage').prop('disabled', this.paging.currentPage == 0);
    },
    nextPage: function () {
        this.paging.currentPage++;
        this.render();
    },
    previousPage: function () {
        this.paging.currentPage--;
        this.render();
    }
});

var AppView = Backbone.View.extend({
    TIME_KEYUP: 700,
    el: $('.container'),
    events: {
        'keyup #searchField': 'search'
    },
    searchTm: null,
    search: function (e) {
        var $searchResultContainer = $('#searchResultContainer'),
            $searchNoResult = $('#searchNoResult'),
            searchStr = $(e.target).val();

        if (this.searchTm) {
            clearTimeout(this.searchTm);
        }

        this.searchTm = setTimeout(function () {
            if (searchStr.length == 0) {
                $searchResultContainer.hide();
                $searchNoResult.show();
            } else {
                pageHelper.loading.show();
                $searchResultContainer.css('opacity', 0.5);

                //make it loading 1 second (client server timing simulation) :)
                setTimeout(function () {
                    $.getJSON("/data/Content.json", function (json) {
                        var items = json.response.results.result;

                        if (items.length > 0) {
                            $searchResultContainer.show();
                            $searchNoResult.hide();
                            new GridItemsView({ model: $.extend(new Items(items), { searchStr: searchStr }) });
                        }
                        else {
                            $searchResultContainer.hide();
                            $searchNoResult.show();
                        }

                        $searchResultContainer.css('opacity', 1);
                        pageHelper.loading.hide();
                    });
                }, 1000);
            }
        }, this.TIME_KEYUP);
    }
});