import re
from multiupload.fields import MultiFileField
from django import forms
from django.db.models.fields import BLANK_CHOICE_DASH
from django.forms.models import model_to_dict, fields_for_model
from django.conf import settings as django_settings
from django.contrib.auth import authenticate, login as login_action
from django.utils.translation import ugettext_lazy as _, string_concat, get_language, activate as translation_activate
from django.core.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from web.django_translated import t
from web import models
from web.settings import FAVORITE_CHARACTER_NAME, FAVORITE_CHARACTERS, ACTIVITY_TAGS, USER_COLORS, GAME_NAME, ENABLED_COLLECTIONS
from web.utils import ordinalNumber, randomString

############################################################
# Internal utils
class MultiImageField(MultiFileField, forms.ImageField):
    pass

class DateInput(forms.DateInput):
    input_type = 'date'

def date_input(field):
    field.widget = DateInput()
    field.widget.attrs.update({
        'class': 'calendar-widget',
        'data-role': 'data',
    })
    field.help_text = ' '
    return field

############################################################
# Form parents to handle request and save owner

class FormWithRequest(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        self.request = kwargs.pop('request', None)
        super(FormWithRequest, self).__init__(*args, **kwargs)

class FormSaveOwner(FormWithRequest):
    def save(self, commit=True):
        instance = super(FormSaveOwner, self).save(commit=False)
        instance.owner = self.request.user if self.request.user.is_authenticated() else None
        if commit:
            instance.save()
        return instance

############################################################
# Users forms

class _UserCheckEmailUsernameForm(FormWithRequest):
    def clean_email(self):
        email = self.cleaned_data.get('email')
        if email and models.User.objects.filter(email=email).exclude(username=self.request.user.username).count():
            raise forms.ValidationError(
                message=t["%(model_name)s with this %(field_labels)s already exists."],
                code='unique_together',
                params={'model_name': t['User'], 'field_labels': t['Email']},
            )
        return email

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if re.search(r'^\d+$', username):
            raise forms.ValidationError(
                message=t["%(field_labels)s can\'t contain only digits."],
                code='unique_together',
                params={'field_labels': t['Username']},
            )
        return username

    def __init__(self, *args, **kwargs):
        super(_UserCheckEmailUsernameForm, self).__init__(*args, **kwargs)
        self.fields['email'].required = True

class CreateUserForm(_UserCheckEmailUsernameForm):
    password = forms.CharField(widget=forms.PasswordInput(), min_length=6, label=t['Password'])

    class Meta:
        model = models.User
        fields = ('email', 'username', 'password')

class UserForm(_UserCheckEmailUsernameForm):
    class Meta:
        model = models.User
        fields = ('username', 'email',)

class EmailsPreferencesForm(FormWithRequest):
    def __init__(self, *args, **kwargs):
        super(EmailsPreferencesForm, self).__init__(*args, **kwargs)
        turned_off = self.request.user.preferences.email_notifications_turned_off
        for (type, sentence) in models.NOTIFICATION_TITLES.items():
            value = True
            if type in turned_off:
                value = False
            self.fields['email{}'.format(type)] = forms.BooleanField(required=False, label=_(sentence), initial=value)

    def save(self, commit=True):
        new_emails_settings = []
        for type in models.NOTIFICATION_TITLES.keys():
            if not self.cleaned_data.get('email{}'.format(type), False):
                new_emails_settings.append(type)
        self.request.user.preferences.save_email_notifications_turned_off(new_emails_settings)
        if commit:
            self.request.user.preferences.save()
        return self.request.user.preferences

    class Meta:
        model = models.UserPreferences
        fields = []

class UserPreferencesForm(FormWithRequest):
    color = forms.ChoiceField(required=False, choices=[], label=_('Color'))

    def __init__(self, *args, **kwargs):
        super(UserPreferencesForm, self).__init__(*args, **kwargs)
        if not FAVORITE_CHARACTERS:
            for i in range(1, 4):
                self.fields.pop('favorite_character{}'.format(i))
        else:
            for i in range(1, 4):
                self.fields['favorite_character{}'.format(i)] = forms.ChoiceField(
                    required=False,
                    choices=BLANK_CHOICE_DASH + [(name, localized) for (name, localized, image) in FAVORITE_CHARACTERS],
                    label=(_(FAVORITE_CHARACTER_NAME) if FAVORITE_CHARACTER_NAME
                           else _('{nth} Favorite Character')).format(nth=_(ordinalNumber(i))))
        self.fields['birthdate'] = date_input(self.fields['birthdate'])
        if USER_COLORS:
            self.fields['color'].choices = BLANK_CHOICE_DASH + [(name, localized_name) for (name, localized_name, css_color, hex_color) in USER_COLORS]
            if self.instance:
                self.fields['color'].initial = self.instance.color
        else:
            self.fields.pop('color')
        self.fields['language'].choices = [l for l in self.fields['language'].choices if l[0]]
        self.old_location = self.instance.location if self.instance else None

    def clean(self):
        favs = [v for (k, v) in self.cleaned_data.items() if k.startswith('favorite_character') and v]
        if favs and len(favs) != len(set(favs)):
            raise forms.ValidationError(_('All your favorites must be unique'))
        return self.cleaned_data

    def save(self, commit=True):
        instance = super(UserPreferencesForm, self).save(commit=False)
        if self.old_location != instance.location:
            instance.location_changed = True
            instance.latitude = None
            instance.longitude = None
        if commit:
            instance.save()
        return instance

    class Meta:
        model = models.UserPreferences
        fields = ('description', 'location', 'favorite_character1', 'favorite_character2', 'favorite_character3', 'color', 'birthdate','language')


class StaffEditUser(FormWithRequest):
    def __init__(self, *args, **kwargs):
        instance = kwargs.pop('instance', None)
        preferences_fields = ('description', 'location')
        preferences_initial = model_to_dict(instance.preferences, preferences_fields) if instance is not None else {}
        super(StaffEditUser, self).__init__(initial=preferences_initial, instance=instance, *args, **kwargs)
        self.fields.update(fields_for_model(models.UserPreferences, preferences_fields))
        self.old_location = instance.preferences.location if instance else None

    def save(self, commit=True):
        instance = super(StaffEditUser, self).save(commit=False)
        if self.old_location != self.cleaned_data['location']:
            instance.preferences.location = self.cleaned_data['location']
            instance.preferences.location_changed = True
            instance.preferences.latitude = None
            instance.preferences.longitude = None
        instance.preferences.description = self.cleaned_data['description']
        instance.preferences.save()
        if commit:
            instance.save()
        return instance

    class Meta:
        model = models.User
        fields = ('username',)

class ChangePasswordForm(FormWithRequest):
    old_password = forms.CharField(widget=forms.PasswordInput(), label=_('Old Password'))
    new_password = forms.CharField(widget=forms.PasswordInput(), label=_('New Password'), min_length=6)
    new_password2 = forms.CharField(widget=forms.PasswordInput(), label=_('New Password Again'))

    def clean_old_password(self):
        old_password = self.cleaned_data.get('old_password')
        self.user = authenticate(username=self.request.user.username, password=old_password)
        if not self.user:
            raise forms.ValidationError(t['Your old password was entered incorrectly. Please enter it again.'])
        return old_password

    def clean(self):
        new_password = self.cleaned_data.get('new_password', None)
        new_password2 = self.cleaned_data.get('new_password2', None)
        if new_password and new_password2 and new_password != new_password2:
            raise forms.ValidationError(t["The two password fields didn't match."])
        return self.cleaned_data

    def save(self, commit=True):
        self.user.set_password(self.cleaned_data['new_password'])
        self.user.save()
        authenticate(username=self.user.username, password=self.cleaned_data['new_password'])
        login_action(self.request, self.user)

    class Meta:
        model = models.User
        fields = []

############################################################
# User links

class AddLinkForm(FormSaveOwner):
    def __init__(self, *args, **kwargs):
        super(AddLinkForm, self).__init__(*args, **kwargs)
        self.fields['relevance'].label = _('How often do you tweet/stream/post about {}?').format(GAME_NAME)
    def save(self, commit=True):
        instance = super(AddLinkForm, self).save(commit)
        if instance.type == 'twitter':
            self.request.user.preferences._cache_twitter = instance.value
            self.request.user.preferences.save()
        return instance

    class Meta:
        model = models.UserLink
        fields = ('type', 'value', 'relevance')

############################################################
# Change language (on top bar)

class LanguagePreferencesForm(FormWithRequest):
    class Meta:
        model = models.UserPreferences
        fields = ('language',)

############################################################
# Confirm delete - works with everything

class ConfirmDelete(forms.Form):
    confirm = forms.BooleanField(required=True, initial=False, label=_('Confirm'))
    thing_to_delete = forms.IntegerField(widget=forms.HiddenInput, required=True)

############################################################
# Activity form

class Activity(FormSaveOwner):
    tags = forms.MultipleChoiceField(
        required=False,
        widget=forms.CheckboxSelectMultiple,
        choices=[],
        label=_('Tags'),
    )

    def __init__(self, *args, **kwargs):
        super(Activity, self).__init__(*args, **kwargs)
        self.fields['language'].initial = self.request.user.preferences.language if self.request.user.is_authenticated() and self.request.user.preferences.language else django_settings.LANGUAGE_CODE
        if ACTIVITY_TAGS:
            self.fields['tags'].choices = ACTIVITY_TAGS
            if self.instance:
                self.fields['tags'].initial = self.instance.tags
        else:
            self.fields.pop('tags')

    def save(self, commit=True):
        instance = super(Activity, self).save(commit=False)
        if 'tags' in self.cleaned_data:
            instance.save_tags(self.cleaned_data['tags'])
        if commit:
            instance.save()
        return instance

    class Meta:
        model = models.Activity
        fields = ('message', 'tags', 'language', 'image')

############################################################
# Add/Edit reports

class ReportForm(FormSaveOwner):
    images = MultiImageField(min_num=0, max_num=10, required=False, label=_('Images'))

    def __init__(self, *args, **kwargs):
        self.type = kwargs.pop('type', None)
        super(ReportForm, self).__init__(*args, **kwargs)
        if self.instance.pk:
            self.reported_thing_id = self.instance.reported_thing_id
            self.type = self.instance.reported_thing
        else:
            if 'id' not in self.request.GET:
                raise PermissionDenied()
            self.reported_thing_id = self.request.GET['id']
            # Check if the reported thing exists
            get_object_or_404(ENABLED_COLLECTIONS[self.type]['queryset'], pk=self.reported_thing_id)

    def save(self, commit=True):
        instance = super(ReportForm, self).save(commit=False)
        instance.reported_thing = self.type
        instance.reported_thing_id = self.reported_thing_id
        old_lang = get_language()
        translation_activate('en')
        instance.reported_thing_title = unicode(ENABLED_COLLECTIONS[self.type]['title'])
        translation_activate(old_lang)
        instance.save()
        for image in self.cleaned_data['images']:
            imageObject = models.UserImage.objects.create()
            imageObject.image.save(randomString(64), image)
            instance.images.add(imageObject)
        return instance

    class Meta:
        model = models.Report
        fields = ('message', 'images')

class FilterReports(FormWithRequest):
    reported_thing = forms.ChoiceField(
        required=False,
        choices=[],
    )
    def __init__(self, *args, **kwargs):
        super(FilterReports, self).__init__(*args, **kwargs)
        self.fields['status'].required = False
        self.fields['status'].initial = models.REPORT_STATUS_PENDING
        self.fields['staff'].required = False
        self.fields['staff'].queryset = self.fields['staff'].queryset.filter(is_staff=True)
        self.fields['reported_thing'].choices = BLANK_CHOICE_DASH + [(name, c['plural_title']) for name, c in ENABLED_COLLECTIONS.items() if name != 'report']

    class Meta:
        model = models.Report
        fields = ('status', 'reported_thing', 'staff')