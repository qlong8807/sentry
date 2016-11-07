import React from 'react';
import Modal from 'react-bootstrap/lib/Modal';

import ApiMixin from '../mixins/apiMixin';
import {FormState} from '../components/forms';
import DropdownLink from '../components/dropdownLink';
import LoadingIndicator from '../components/loadingIndicator';
import MenuItem from '../components/menuItem';
import OrganizationHomeContainer from '../components/organizations/homeContainer';
import PluginComponentBase from '../components/bases/pluginComponentBase';
import {t, tct} from '../locale';

const UNKNOWN_ERROR = {
  error_type: 'unknown',
};

class AddRepositoryLink extends PluginComponentBase {
  constructor(props) {
    super(props);

    Object.assign(this.state, {
      isModalOpen: false,
      fieldList: null,
      loading: true,
      state: FormState.LOADING,
      error: {},
      formData: {},
    });

    ['onOpen',
     'onCancel',
     'onSave',
     'changeField'].map(method => this[method] = this[method].bind(this));
  }

  onOpen() {
    this.setState({isModalOpen: true});
  }

  onCancel() {
    this.setState({isModalOpen: false});
  }

  onSubmit() {
    this.api.request(`/organizations/${this.props.orgId}/repos/`, {
      data: {
        provider: this.props.provider.id,
        ...this.state.formData,
      },
      method: 'POST',
      success: this.onSaveSuccess.bind(this, data => {
        this.setState({isModalOpen: false});
        // Do something useful here
      }),
      error: this.onSaveError.bind(this, error => {
        this.setState({
          error: (error.responseJSON || UNKNOWN_ERROR) || UNKNOWN_ERROR,
        });
      }),
      complete: this.onSaveComplete
    });
  }

  changeField(name, value) {
    let formData = this.state.formData;
    formData[name] = value;
    this.setState({[name]: formData});
  }

  renderForm() {
    let errors = this.state.error.errors || {};
    let provider = this.props.provider;
    return (
      <form onSubmit={this.onSubmit}>
        {provider.config.map((field) => {
          return (
            <div key={field.name}>
              {this.renderField({
                config: field,
                formData: this.state.formData,
                formErrors: errors,
                onChange: this.changeField.bind(this, field.name)
              })}
            </div>
          );
        })}
      </form>
    );
  }

  renderBody() {
    let error = this.state.error;
    if (error.error_type === 'auth') {
      let authUrl = error.auth_url;
      if (authUrl.indexOf('?') === -1) {
        authUrl += '?next=' + encodeURIComponent(document.location.pathname);
      } else {
        authUrl += '&next=' + encodeURIComponent(document.location.pathname);
      }
      return (
        <div>
          <div className="alert alert-warning m-b-1">
            {'You need to associate an identity with ' + error.title +
             ' before you can create issues with this service.'}
          </div>
          <a className="btn btn-primary" href={authUrl}>
            Associate Identity
          </a>
        </div>
      );
    } else if (error.error_type && error.error_type !== 'validation') {
      return (
        <div className="alert alert-error alert-block">
          <p>
            {error.message ?
              error.message
            :
              tct('An unknown error occurred. Need help with this? [link:Contact support]', {
                link: <a href="https://sentry.io/support/"/>
              })
            }
          </p>
        </div>
      );
    }
    return this.renderForm();
  }

  renderModal() {
    return (
      <Modal show={this.state.isModalOpen} animation={false}>
        <div className="modal-header">
          <h4>{t('Add Repository')}</h4>
        </div>
        <div className="modal-body">
          {this.renderBody()}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-default"
                  onClick={this.onCancel}>{t('Cancel')}</button>
          <button type="button" className="btn btn-primary"
                  onClick={this.onSubmit}>{t('Save Changes')}</button>
        </div>
      </Modal>
    );
  }

  render() {
    let provider = this.props.provider;
    return (
      <a onClick={this.onOpen}>
        {provider.name}
        {this.renderModal()}
      </a>
    );
  }
}

AddRepositoryLink.propTypes = {
  provider: React.PropTypes.object.isRequired,
};

const OrganizationRepositories = React.createClass({
  mixins: [
    ApiMixin,
  ],

  getInitialState() {
    return {
      loading: true,
      error: false,
      itemList: null,
      repoConfig: null,
    };
  },

  componentWillMount() {
    this.fetchData();
  },

  fetchData() {
    this.api.request(`/organizations/${this.props.params.orgId}/repos/`, {
      method: 'GET',
      success: (data) => {
        this.setState({
          itemList: data,
          loading: !this.state.repoConfig,
        });
      },
      error: () => {
        this.setState({
          loading: !this.state.repoConfig,
          error: true,
        });
      }
    });
    this.api.request(`/organizations/${this.props.params.orgId}/config/repos/`, {
      method: 'GET',
      success: (data) => {
        this.setState({
          repoConfig: data,
          loading: !this.state.itemList,
        });
      },
      error: () => {
        this.setState({
          loading: !this.state.itemList,
          error: true,
        });
      }
    });
  },

  addRepository(provider) {

  },

  render() {
    if (this.state.loading)
      return <LoadingIndicator />;

    let orgId = this.props.params.orgId;

    return (
      <OrganizationHomeContainer>
        <h2>{t('Repositories')}</h2>
        <table className="table table-bordered">
          <tbody>
            {this.state.itemList.map((repo) => {
              return <tr key={repo.id}><td><a>{repo.name}</a></td></tr>;
            })}
          </tbody>
        </table>
        <DropdownLink
            className="btn btn-primary btn-sm"
            title={t('Add Repository')}>
          {this.state.repoConfig.providers.map((provider) => {
            return (
              <MenuItem noAnchor={true} key={provider.id}>
                <AddRepositoryLink provider={provider} orgId={orgId} />
              </MenuItem>
            );
          })}
        </DropdownLink>
      </OrganizationHomeContainer>
    );
  }
});

export default OrganizationRepositories;
