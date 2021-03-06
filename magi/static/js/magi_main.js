
// *****************************************
// *****************************************
// Always called

// *****************************************
// Auto load forms

function disableButton(button) {
    button.unbind('click');
    button.click(function(e) {
        e.preventDefault();
        return false;
    });
}

function formloaders() {
    $('button[data-form-loader=true]').closest('form').attr('novalidate', true);
    $('button[data-form-loader=true]').click(function(e) {
        $(this).html('<i class="flaticon-loading"></i>');
        disableButton($(this));
    });
}

// *****************************************
// Smooth page scroll

function loadPageScroll() {
    $('a.page-scroll').unbind('click');
    $('a.page-scroll').bind('click', function(event) {
        var $anchor = $(this);
        $('html, body').stop().animate({
            scrollTop: $($anchor.attr('href')).offset().top
        }, 1500, 'easeInOutExpo');
        event.preventDefault();
    });
}

// *****************************************
// Check if date input is supported and add an help text otherwise

function dateInputSupport() {
    if ($('input[type="date"]').length > 0) {
        var input = document.createElement('input');
        input.setAttribute('type', 'date');
        if (input.type == 'date') {
            $('input[type="date"]').parent().find('.help-block').hide();
        }
    }
}

// *****************************************
// Hide Staff Buttons

var staff_buttons_hidden = true;

function hideStaffButtons(show) {
    if (show) {
        $('.staff-only').show();
        $('.staff-only').closest('.btn-group').each(function () {
            $(this).find('.btn:not(.staff-only)').last().css('border-top-right-radius', 0).css('border-bottom-right-radius', 0);
        })
        staff_buttons_hidden = false;
    } else {
        $('.staff-only').hide();
        $('.staff-only').closest('.btn-group').each(function () {
            var radius = $(this).find('.btn:not(.staff-only)').first().css('border-top-left-radius');
            $(this).find('.btn:not(.staff-only)').last().css('border-top-right-radius', radius).css('border-bottom-right-radius', radius);
        })
        staff_buttons_hidden = true;
    }
}

function loadStaffOnlyButtons() {
    let button = $('a[href="#hideStaffButtons"]');
    if ($('.staff-only').length < 1) {
        button.hide();
        return;
    }
    button.show();
    hideStaffButtons(!staff_buttons_hidden);
    button.unbind('click');
    button.click(function(e) {
        e.preventDefault();
        hideStaffButtons(staff_buttons_hidden);
        $(this).blur();
        return false;
    });
}

// *****************************************
// Notifications

function notificationsHandler() {
    var button = $('a[href="/notifications/"]');
    var world = button.find('.flaticon-world');
    var loader = button.find('.flaticon-loading');
    var badge = button.find('.badge');
    if (badge.length > 0 && $(document).width() > 992) {
        var onClick = function(e) {
            e.preventDefault();
            button.unbind('click');
            world.hide();
            loader.show();
            $.get('/ajax/notifications/?ajax_modal_only&page_size=2', function(data) {
                var onShown = function() {
                    var remaining = $('nav.navbar ul.navbar-right .popover span.remaining').text();
                    if (remaining != '') {
                        badge.text(remaining);
                        badge.show();
                    } else {
                        button.unbind('click');
                    }
                };
                loader.hide();
                badge.hide();
                world.show();
                if ($('nav.navbar ul.navbar-right .popover').is(':visible')) {
                    $('nav.navbar ul.navbar-right .popover .popover-content').html(data);
                    onShown();
                } else {
                    button.popover({
                        container: $('nav.navbar ul.navbar-right'),
                        html: true,
                        placement: 'bottom',
                        content: data,
                        trigger: 'manual',
                    });
                    button.popover('show');
                    button.on('shown.bs.popover', function () {
                        onShown();
                    });
                }
            });
            return false;
        };
        button.click(onClick);
    }
}

// *****************************************
// Ajax modals

function ajaxModals() {
    $('[data-ajax-url]').each(function() {
        var button = $(this);
        var modalButtons = 0;
        if (button.data('ajax-show-button') == true) {
            modalButtons = undefined;
        }
        var button_content = button.html();
        button.unbind('click');
        button.click(function(e) {
            var button_display = button.css('display');
            if (button_display == 'inline') {
                button.css('display', 'inline-block');
            }
            var button_height = button.height();
            var button_width = button.width();
            button.html('<div class="text-center"><i class="flaticon-loading"></i></div>');
            var loader_wrapper = button.find('div');
            loader_wrapper.height(button_height);
            loader_wrapper.width(button_width);
            var loader = button.find('.flaticon-loading');
            let smaller = button_height < button_width ? button_height : button_width;
            loader.height(smaller);
            loader.width(smaller);
            loader.css('line-height', smaller + 'px');
            loader.css('font-size', (smaller - (smaller * 0.4)) + 'px');
            $.get(button.data('ajax-url'), function(data) {
                if (data && data.indexOf('<!DOCTYPE html>') !== -1) {
                    window.location.href = button.data('ajax-url').replace('/ajax/', '/');
                    return false;
                }
                button.css('display', button_display);
                button.html(button_content);
                var title = button.data('ajax-title');
                title = typeof title == 'undefined' ? button_content : title;
                modal_size = button.data('ajax-modal-size');
                freeModal(title, data, modalButtons, modal_size);
                if (typeof button.attr('href') != 'undefined') {
                    $('#freeModal').data('original-url', button.attr('href'));
                }
                loadCommons();
                if (typeof button.data('ajax-handle-form') != 'undefined') {
                    var ajaxModals_handleForms;
                    ajaxModals_handleForms = function() {
                        formloaders();
                        $('#freeModal form').submit(function(e) {
                            e.preventDefault();
                            var form_name = $(this).find('.generic-form-submit-button').attr('name');
                            $(this).ajaxSubmit({
                                context: this,
                                success: function(data) {
                                    var form_modal_size = modal_size;
                                    if (typeof form_name != 'undefined'
                                        && $(data).find('form .generic-form-submit-button[name="' + form_name + '"]').length == 0
                                        && $(data).find('form .errorlist').length == 0
                                        && typeof button.data('ajax-modal-after-form-size') != 'undefined') {
                                        form_modal_size = button.data('ajax-modal-after-form-size');
                                    }
                                    freeModal(title, data, modalButtons, form_modal_size);
                                    if (typeof form_name != 'undefined'
                                        && $('#freeModal form .generic-form-submit-button[name="' + form_name + '"]').length > 0
                                        && $('#freeModal form .errorlist').length > 0) {
                                        ajaxModals_handleForms();
                                    }
                                    loadCommons();
                                },
                                error: genericAjaxError,
                            });
                            return false;
                        });
                    };
                    ajaxModals_handleForms();
                }
            });
            return false;
        });
    });
}

// *****************************************
// Ajax popovers

function ajaxPopovers() {
    $('[data-ajax-popover]').each(function() {
        var button = $(this);
        button.unbind('click');
        button.click(function(e) {
            e.preventDefault();
            var popover = button.data('bs.popover');
            if (!popover) {
                if (button.popover)
                    button.popover({
                        content: '<i class="flaticon-loading"></i>',
                        html: true,
                        container: 'body',
                        trigger: 'manual',
                        placement: 'bottom',
                    });
                button.popover('show');
                popover = button.data('bs.popover');
                $.get(button.data('ajax-popover'), function(data) {
                    popover.options.content = data;
                    button.on('shown.bs.popover', function() {
                        loadCommons();
                    });
                    button.popover('show');
                })
            } else {
                button.popover('show');
            }
        });
    });
}

// *****************************************
// Load countdowns

function _loadCountdowns() {
    $('.countdown').each(function() {
        var elt = $(this);
        var format = typeof elt.data('format') != undefined ? elt.data('format') : '{time}';
        elt.countdown({
            date: elt.data('date'),
            render: function(data) {
                $(this.el).text(format.replace('{time}', data.days + ' ' + gettext('days') + ' ' + data.hours + ' ' + gettext('hours') + ' ' + data.min + ' ' + gettext('minutes') + ' ' + data.sec + ' ' + gettext('seconds')));
            },
        });
    });
}

function loadCountdowns() {
    if ($('.countdown').length > 0) {
        if (typeof Countdown == 'undefined') {
            $.getScript(static_url + 'bower/countdown/dest/jquery.countdown.min.js', _loadCountdowns);
        } else {
            _loadCountdowns();
        }
    }
}

// *****************************************
// Load timezone dates

function _loadTimezones() {
    $('.timezone').each(function() {
        var elt = $(this);
        if (elt.data('converted') == true) {
            return;
        }
        elt.data('converted', true);
        var date = new Date(elt.find('.datetime').text());
        var timezone = elt.data('to-timezone');
        var options = {
            year: elt.data('year-format') || (elt.data('hide-year') ? undefined : 'numeric'),
            month: elt.data('month-format') || (elt.data('hide-month') ? undefined : 'long'),
            day: elt.data('day-format') || (elt.data('hide-day') ? undefined : 'numeric'),
            hour: elt.data('hour-format') || (elt.data('hide-hour') ? undefined : 'numeric'),
            minute: elt.data('minute-format') || (elt.data('hide-minute') ? undefined : 'numeric'),
        };
        if (typeof timezone != 'undefined' && timezone != '' && timezone != 'Local time') {
            options['timeZone'] = timezone;
        } else {
            timezone = 'Local time';
        }
        var converted_date = date.toLocaleString($('html').attr('lang'), options);
        elt.find('.datetime').text(converted_date);
        elt.find('.current_timezone').text(gettext(timezone));
        if (typeof elt.data('timeago') != 'undefined') {
            var html = elt.html();
            elt.html(jQuery.timeago(date));
            elt.tooltip({
                html: true,
                title: html,
                trigger: 'hover',
            });
        }
        elt.show();
    });
}

function loadTimezones() {
    if ($('[data-timeago]').length > 0 && typeof jQuery.timeago == 'undefined') {
        $.getScript(static_url + 'bower/jquery-timeago/jquery.timeago.js', function() {
            $.getScript(static_url + 'bower/jquery-timeago/locales/jquery.timeago.' + $('html').attr('lang')+ '.js', function() {
                jQuery.timeago.settings.allowPast = true;
                jQuery.timeago.settings.allowFuture = true;
                _loadTimezones();
            });
        });
    } else {
        _loadTimezones();
    }
}

// *****************************************
// On back button close modal

var realBack = false;
var calledBack = false;

function onBackButtonCloseModal() {
    $('.modal').on('shown.bs.modal', function()  {
        var urlReplace;
        var original_url = $(this).data('original-url');
        if (typeof original_url != 'undefined') {
            urlReplace = original_url;
        } else {
            urlReplace = '#' + $(this).attr('id');
        }
        history.pushState(null, null, urlReplace);
    });

    $('.modal').on('hidden.bs.modal', function()  {
        if (realBack == false) {
            calledBack = true;
            history.back();
        } else {
            realBack = false;
        }
    });
    $(window).on('popstate', function() {
        if (calledBack == false) {
            realBack = true;
        }
        calledBack = false;
        $('.modal').modal('hide');
    });
}

// *****************************************
// Side bar toggle button

function sideBarToggleButton() {
    $('#togglebutton, .togglebutton').click(function(e) {
        e.preventDefault();
        $('#wrapper').toggleClass('toggled');
        $(this).blur();
    });
}

// *****************************************
// Switch language

function switchLanguage() {
    $('#switchLanguage + .cuteform img').click(function() {
        $(this).closest('form').submit();
    });
}

// *****************************************

// uniquePerOwner can also be set in data-unique-per-owner
function directAddCollectible(buttons, uniquePerOwner) {
    buttons.unbind('click');
    buttons.each(function() {
        var button = $(this);
        var form_url = button.data('ajax-url');
        var add_to_id = button.data('quick-add-to-id');
        var fk_as_owner = button.data('quick-add-to-fk-as-owner');
        if (form_url.indexOf('/add/') < 0) {
            return;
        }
        button.removeAttr('data-ajax-url');
        button.click(function(e) {
            e.preventDefault();
            if (button.find('.flaticon-loading').length > 0) {
                return;
            }
            var button_content = button.html();
            if (!(typeof uniquePerOwner !== 'undefined' ? uniquePerOwner : button.data('unique-per-owner') === true)
                || button.find('.badge').text() === '0') {
                // Add
                button.html('<i class="flaticon-loading"></i>');
                $.get(form_url, function(data) {
                    var form = $(data).find('form');
                    if (typeof add_to_id !== 'undefined') {
                        form.find('#id_' + fk_as_owner).val(add_to_id);
                    }
                    form.ajaxSubmit({
                        success: function(data) {
                            button.html(button_content);
                            if ($(data).hasClass('success')) {
                                button.find('.badge').text(parseInt(button.find('.badge').text()) + 1);
                                var alt_message = button.data('alt-message');
                                if (alt_message) {
                                    button.data('alt-message', button.find('.message').text().trim());
                                    button.find('.message').text(alt_message);
                                    button.prop('title', alt_message);
                                    if (button.data('toggle') == 'tooltip') {
                                        button.tooltip('fixTitle');
                                    }
                                    button.data('original-title', alt_message);
                                }
                                button.find('.badge').show();
                                if (button.data('toggle') == 'tooltip') {
                                    button.tooltip('hide');
                                }
                            }
                            else {
                                genericAjaxError({ responseText: 'Error' });
                            }
                        },
                        error: genericAjaxError,
                    });
                });
            } else {
                // Delete
                button.html('<i class="flaticon-loading"></i>');
                $.get('/ajax/' + button.data('btn-name') + '/edit/unique/?' + button.data('parent-item') + '_id=' + button.data('parent-item-id') + (fk_as_owner ? ('&' + fk_as_owner + '=' + add_to_id) : ''), function(data) {
                    var form = $(data).find('form[data-form-name^="delete_"]');
                    form.find('#id_confirm').prop('checked', true);
                    form.ajaxSubmit({
                        success: function(data) {
                            button.html(button_content);
                            if ($(data).hasClass('success')) {
                                button.find('.badge').text(parseInt(button.find('.badge').text()) - 1);
                                var alt_message = button.data('alt-message');
                                if (alt_message) {
                                    button.data('alt-message', button.find('.message').text());
                                    button.find('.message').text(alt_message);
                                    button.prop('title', alt_message);
                                    if (button.data('toggle') == 'tooltip') {
                                        button.tooltip('fixTitle');
                                    }
                                    button.data('original-title', alt_message);
                                }
                                button.find('.badge').hide();
                                if (button.data('toggle') == 'tooltip') {
                                    button.tooltip('hide');
                                }
                            }
                            else {
                                genericAjaxError({ responseText: 'Error' });
                            }
                        },
                        error: genericAjaxError,
                    });
                });
            }
        });
    });
}

// *****************************************
// Items reloaders

function itemsReloaders() {
    if (typeof ids_to_reload != 'undefined') {
        $.each(reload_urls_start_with, function(index, url_start_with) {
            $('[href^="' + url_start_with + '"]:not(.reload-handler)').click(function(e) {
                var item_id = $(this).closest('[data-item-id]').data('item-id');
                ids_to_reload.push(item_id);
                $(this).addClass('reload-handler');
            });
        });
    }
    if (typeof reload_item != 'undefined') {
        $.each(reload_urls_start_with, function(index, url_start_with) {
            $('[href^="' + url_start_with + '"]:not(.reload-item-handler)').click(function(e) {
                reload_item = true;
                $(this).addClass('reload-item-handler');
            });
        });
    }
}

var reloaderLocation;

function modalItemsReloaders() {
    if (typeof ids_to_reload != 'undefined') {
        reloaderLocation = location.search;
        $('.modal').on('hidden.bs.modal', function(e) {
            ids_to_reload = $.unique(ids_to_reload);
            if (ids_to_reload.length > 0) {
                $.get(ajax_reload_url + reloaderLocation + (reloaderLocation == '' ? '?' : '&') + 'ids=' + ids_to_reload.join(',')
                    + '&page_size=' + ids_to_reload.length, function(data) {
                        var html = $(data);
                        $.each(ids_to_reload, function(index, id) {
                            var previous_item = $('[data-item="' + reload_data_item + '"][data-item-id="' + id + '"]');
                            var new_item = html.find('[data-item="' + reload_data_item + '"][data-item-id="' + id + '"]');
                            if (new_item.length == 0) {
                                // If not returned, remove it
                                previous_item.remove();
                            } else {
                                // Replace element
                                previous_item.replaceWith(new_item);
                            }
                        });
                        ids_to_reload = [];
                        if (ajax_pagination_callback) {
                            ajax_pagination_callback();
                        }
                        loadCommons();
                    });
            }
        });
    }
    if (typeof reload_item != 'undefined') {
        $('.modal').on('hidden.bs.modal', function(e) {
            if (reload_item === true) {
                $.get(ajax_reload_url, function(data) {
                    $('.item-container').html(data);
                    reload_item = false;
                    loadCommons();
                });
            }
        });
    }
}

// *****************************************
// Dismiss popovers on click outside

function dismissPopoversOnClickOutside() {
    $('body').on('click', function (e) {
        if ($(e.target).data('toggle') !== 'popover'
            && $(e.target).parents('.popover.in').length === 0
            && $(e.target).data('manual-popover') != true
            && typeof $(e.target).data('ajax-popover') == 'undefined'
            && $(e.target).closest('[data-ajax-popover]').length === 0) {
            hidePopovers();
        }
    });
}

// *****************************************
// Load commons on modal shown

function loadCommonsOnModalShown() {
    $('.modal').on('shown.bs.modal', function (e) {
        loadCommons();
    });
}

function hideCommonsOnModalShown() {
    $('#freeModal').on('show.bs.modal', function() {
        $('main [data-toggle="tooltip"]').tooltip('hide');
        $('main [data-toggle="popover"]').popover('hide');
        $('main [data-ajax-popover]').popover('hide');
    });
}

// *****************************************
// Loaded in all pages

$(document).ready(function() {
    loadCommons(true);
    modalItemsReloaders();
    notificationsHandler();
    sideBarToggleButton();
    onBackButtonCloseModal();
    loadCommonsOnModalShown();
    hideCommonsOnModalShown();
    loadPageScroll();
    dismissPopoversOnClickOutside();
    switchLanguage();
});

// *****************************************
// *****************************************
// Tools to call

// *****************************************
// Reload common things, called:
// - on load of any page
// - when a view is loaded in a modal
// - when a new pagination page is loaded

function loadCommons(onPageLoad /* optional = false */) {
    onPageLoad = typeof onPageLoad == 'undefined' ? false : onPageLoad;
    loadToolTips();
    loadPopovers();
    formloaders();
    dateInputSupport();
    loadStaffOnlyButtons();
    ajaxModals();
    ajaxPopovers();
    loadCountdowns();
    loadTimezones();
    loadMarkdown();
    reloadDisqus();
    itemsReloaders();
    directAddCollectible($('[data-quick-add-to-collection="true"]'));
}

// *****************************************
// Load bootstrap

function loadToolTips() {
    $('[data-toggle="tooltip"]').tooltip();
}

function loadPopovers() {
    $('[data-toggle="popover"]').popover();
}

// *****************************************
// Get text

function gettext(term) {
    var translated_term = translated_terms[term]
    if (typeof translated_term != 'undefined') {
        return translated_term;
    }
    return term;
}

// *****************************************
// Modal

// Use true for modal_size to not change the size
// Use 0 for buttons to remove all buttons
function freeModal(title, body, buttons /* optional */, modal_size /* optional */) {
    keep_size = modal_size === true;
    if (!keep_size) {
        $('#freeModal .modal-dialog').removeClass('modal-lg');
        $('#freeModal .modal-dialog').removeClass('modal-md');
        $('#freeModal .modal-dialog').removeClass('modal-sm');
        if (typeof modal_size != 'undefined') {
            $('#freeModal .modal-dialog').addClass('modal-' + modal_size);
        } else {
            $('#freeModal .modal-dialog').addClass('modal-lg');
        }
    }
    $('#freeModal .modal-header h4').html(title);
    $('#freeModal .modal-body').html(body);
    $('#freeModal .modal-footer').html('<button type="button" class="btn btn-main" data-dismiss="modal">OK</button>');
    if (buttons === 0) {
        $('#freeModal .modal-footer').hide();
    } else if (typeof buttons != 'undefined') {
        $('#freeModal .modal-footer').html(buttons);
        $('#freeModal .modal-footer').show();
    }
    $('#freeModal').modal('show');
}

function confirmModal(onConfirmed, onCanceled /* optional */, title /* optional */, body /* optional */) {
    title = typeof title == 'undefined' ? gettext('Confirm') : title;
    body = typeof body == 'undefined' ? gettext('You can\'t cancel this action afterwards.') : body;
    freeModal(title, body, '\
<button type="button" class="btn btn-default">' + gettext('Cancel') + '</button>\
<button type="button" class="btn btn-danger">' + gettext('Confirm') + '</button>');
    $('#freeModal .modal-footer .btn-danger').click(function() {
        onConfirmed();
        $('#freeModal').modal('hide');
    });
    $('#freeModal .modal-footer .btn-default').click(function() {
        if (typeof onCanceled != 'undefined') {
            onCanceled();
        }
        $('#freeModal').modal('hide');
    });
}

// *****************************************
// Pagination

function load_more_function(nextPageUrl, newPageParameters, newPageCallback /* optional */, onClick) {
    var button = $('#load_more');
    button.html('<div class="loader"><i class="flaticon-loading"></i></div>');
    var next_page = button.attr('data-next-page');
    $.get(nextPageUrl + location.search + (location.search == '' ? '?' : '&') + 'page=' + next_page + newPageParameters, function(data) {
        button.replaceWith(data);
        if (onClick) {
            paginationOnClick(onClick, nextPageUrl, newPageParameters, newPageCallback);
        } else {
            pagination(nextPageUrl, newPageParameters, newPageCallback);
        }
        if (typeof newPageCallback != 'undefined') {
            newPageCallback();
        }
        loadCommons();
    });
}

function pagination(nextPageUrl, newPageParameters, newPageCallback /* optional */) {
    var button = $('#load_more');
    if (button.length > 0
        && button.find('.loader').length == 0
        && ($(window).scrollTop() + $(window).height()) >= ($(document).height() - button.height() - 600)) {
        load_more_function(nextPageUrl, newPageParameters, newPageCallback, false);
    }
    $(window).scroll(
        function () {
            if (button.length > 0
                && button.find('.loader').length == 0
                && ($(window).scrollTop() + $(window).height())
                >= ($(document).height() - button.height() - 600)) {
                load_more_function(nextPageUrl, newPageParameters, newPageCallback, false);
            }
        });
}

function paginationOnClick(buttonId, nextPageUrl, newPageParameters, newPageCallback /* optional */) {
    var button = $('#' + buttonId);
    button.unbind('click');
    button.click(function(e) {
        e.preventDefault();
        load_more_function(nextPageUrl, newPageParameters, newPageCallback, buttonId);
        return false;
    });
}

// *****************************************
// Reload disqus count

function reloadDisqus() {
    if ($('[href$="#disqus_thread"], .disqus-comment-count').length > 0) {
        window.DISQUSWIDGETS = undefined;
        $.getScript('http://' + disqus_shortname + '.disqus.com/count.js');
    }
}

// *****************************************
// Hide all the popovers

function hidePopovers() {
    $('[data-manual-popover=true]').popover('hide');
    $('[data-ajax-popover]').popover('hide');
    $('[data-toggle=popover]').popover('hide');
    $('a[href="/notifications/"]').popover('destroy');
}

// *****************************************
// Generic ajax error

function genericAjaxError(xhr, ajaxOptions, thrownError) {
    alert(xhr.responseText);
}

// *****************************************
// Handle actions on activities view

function updateActivities() {
    $('a[href=#likecount]').unbind('click');
    $('a[href=#likecount]').click(function(e) {
        e.preventDefault();
        var button = $(this);
        var socialbar = button.closest('.socialbar');
        var loader = socialbar.find('.hidden-loader');
        var activity_id = socialbar.closest('.activity').data('id');
        button.hide();
        loader.show();
        $.get('/ajax/users/?ajax_modal_only&liked_activity=' + activity_id, function(data) {
            loader.hide();
            button.show();
            freeModal(gettext('Liked this activity'), data);
        });
        return false;
    });
    $('.likeactivity').unbind('submit');
    $('.likeactivity').submit(function(e) {
        e.preventDefault();
        var loader = $(this).find('.hidden-loader');
        var button = $(this).find('button[type=submit]');
        loader.width(button.width());
        button.hide();
        loader.show();
        $(this).ajaxSubmit({
            context: this,
            success: function(data) {
                if (data['result'] == 'liked' || data['result'] == 'unliked') {
                    if (data['result'] == 'liked') {
                        $(this).find('input[type=hidden]').prop('name', 'unlike');
                    } else if (data['result'] == 'unliked') {
                        $(this).find('input[type=hidden]').prop('name', 'like');
                    }
                    var value = button.html();
                    button.html(button.attr('data-reverse'));
                    button.attr('data-reverse', value);
                }
                loader.hide();
                button.show();
                if (typeof data['total_likes'] != 'undefined') {
                    $(this).find('a[href="#likecount"]').text(data['total_likes']);
                }
            },
            error: genericAjaxError,
        });
        return false;
    });
}

// *****************************************
// Markdown + AutoLink

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
};

function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
        return entityMap[s];
    });
}

function applyMarkdown(elt) {
    elt.html(Autolinker.link(marked(escapeHtml(elt.text())), { newWindow: true, stripPrefix: true } ));
}

function _loadMarkdown() {
    $('.to-markdown:not(.markdowned)').each(function() {
        applyMarkdown($(this));
        $(this).addClass('markdowned');
    });
}

function loadMarkdown() {
    if ($('.to-markdown').length > 0) {
        if (typeof marked == 'undefined') {
            $.getScript(static_url + 'bower/marked/lib/marked.js', _loadMarkdown);
        } else {
            _loadMarkdown();
        }
    }
}

// *****************************************
// Load Badges

function updateBadges() {
    ajaxModals();
}

function afterLoadBadges(user_id) {
    updateBadges();
    pagination('/ajax/badges/', '&of_user=' + user_id, updateBadges);
}

function loadBadges(tab_name, user_id, onDone) {
    $.get('/ajax/badges/?of_user=' + user_id, function(data) {
        if (data.trim() == "") {
            onDone('<div class="padding20"><div class="alert alert-warning">' + gettext('No result.') + '</div></div>', loadBadges);
        } else {
            onDone(data, afterLoadBadges);
        }
    });
}

// *****************************************
// d_FieldCheckBoxes

function _hideDetails() {
    let formGroup = $(this).closest('.form-group');
    formGroup.find('.help-block').hide();
}

function _switchBold() {
    let formGroup = $(this).closest('.form-group');
    formGroup.find('label').css('font-weight', 'normal');
    formGroup.find('.help-block').css('font-weight', 'bold');
    if ($(window).width() > 762) {
        formGroup.find('.help-block').css('margin-left', '-50%');;
        formGroup.find('.help-block').css('width', '150%');;
    }
}

function d_FieldCheckBoxes(selector) {
    selector.each(_switchBold);
    selector.not(":eq(0)").each(_hideDetails);
}

// *****************************************
// iTunes

function pauseAllSongs() {
    $('audio').each(function() {
        $(this)[0].pause();
        $(this).closest('div').find('[href=#play] i').removeClass();
        $(this).closest('div').find('[href=#play] i').addClass('flaticon-play');
    });
}

function loadiTunesData(song, successCallback, errorCallback) {
    var itunes_id = song.data('itunes-id');
    $.ajax({
        "url": 'https://itunes.apple.com/lookup',
        "dataType": "jsonp",
        "data": {
            "country": "JP",
            "id": itunes_id,
        },
        "error": function (jqXHR, textStatus, message) {
            if (typeof errorCallback != 'undefined') {
                errorCallback();
            }
            alert('Oops! This music doesn\'t seem to be valid anymore. Please contact us and we will fix this.');
        },
        "success": function (data, textStatus, jqXHR) {
            data = data['results'][0];
            let details = song.find('.itunes-details');
            details.find('.album').prop('src', data['artworkUrl60']);
            details.find('.itunes-link').prop('href', data['trackViewUrl'] + '&at=1001l8e6');
            details.show('slow');
            song.find('audio source').prop('src', data['previewUrl'])
            song.find('audio')[0].load();
            playSongButtons();
            if (typeof successCallback != 'undefined') {
                successCallback(song, data);
            }
        }
    });
}

function loadAlliTunesData(successCallback, errorCallback) {
    $('.itunes').each(function() {
        $(this).html('<audio controls="" id="player" class="hidden">\
            <source src="" type="audio/mp4">\
              Your browser does not support the audio element.\
          </audio>\
          <span style="display: none" class="itunes-details">\
            <img src="" alt="Future style" class="album img-rounded" height="31">\
            <a href="" target="_blank" class="itunes-link">\
              <img src="' + static_url + 'img/get_itunes.svg" alt="Get it on iTunes" height="31">\
            </a>\
          </span>\
          <a href="#play" class="fontx1-5"><i class="flaticon-play"></i></a>\
');
        loadiTunesData($(this), successCallback, errorCallback);
    });
}

function playSongButtons() {
    $('audio').on('ended', function() {
        pauseAllSongs();
    });
    $('[href=#play]').unbind('click');
    $('[href=#play]').click(function(event) {
        event.preventDefault();
        var button = $(this);
        var button_i = button.find('i');
        var song = button.closest('.itunes');
        // Stop all previously playing audio
        if (button_i.prop('class') == 'flaticon-pause') {
            pauseAllSongs();
            return;
        }
        pauseAllSongs();
        if (song.find('audio source').attr('src') != '') {
            song.find('audio')[0].play();
            button_i.removeClass();
            button_i.addClass('flaticon-pause');
        } else {
            button_i.removeClass();
            button_i.addClass('flaticon-loading');
            loadiTunesData(song, function(data) {
                song.find('audio')[0].play();
                button_i.removeClass();
                button_i.addClass('flaticon-pause');
            }, function() {
                button_i.removeClass();
                button_i.addClass('flaticon-play');
            });
        }
        return false;
    });
}
