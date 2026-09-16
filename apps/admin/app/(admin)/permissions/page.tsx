import { cookies } from 'next/headers';
import { apiGet } from '../../../lib/api';
import { ADMIN_ACCESS_TOKEN_COOKIE } from '../../../lib/session-constants';
import { grantPermissionAction, revokePermissionAction } from '../../../lib/permissions-actions';

interface PermissionRow {
  id: string;
  key: string;
  description: string;
  roles: string[];
}

// Roles that can be toggled. ADMIN is excluded — ADMIN bypasses all permission
// checks at the guard level and cannot be modified via this console.
const ROLES = [
  { value: 'CITIZEN',            label: 'Citizen' },
  { value: 'RESEARCHER',         label: 'Researcher' },
  { value: 'ORGANIZATION_ADMIN', label: 'Org Admin' },
  { value: 'GOVERNMENT',         label: 'Government' },
  { value: 'MODERATOR',          label: 'Moderator' },
] as const;

export default async function PermissionsPage(
  props: {
    searchParams: Promise<{ success?: string; error?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const accessToken = (await cookies()).get(ADMIN_ACCESS_TOKEN_COOKIE)?.value ?? '';
  const permissions = await apiGet<PermissionRow[]>('/api/v1/admin/permissions', accessToken);

  return (
    <>
      <div className="page-header">
        <h1>Role Permissions</h1>
        <p>
          Control which roles can perform each action. ADMIN always has full access regardless of
          these settings.
        </p>
      </div>

      {searchParams.success === 'granted' && (
        <div className="flash flash-success">Permission granted.</div>
      )}
      {searchParams.success === 'revoked' && (
        <div className="flash flash-success">Permission revoked.</div>
      )}
      {searchParams.error && (
        <div className="flash flash-error">{searchParams.error}</div>
      )}

      <div className="table-wrapper" style={{ overflowX: 'auto' }}>
        <table className="perm-table">
          <thead>
            <tr>
              <th className="perm-col-key">Permission</th>
              {ROLES.map((r) => (
                <th key={r.value} className="perm-col-role">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((perm) => (
              <tr key={perm.id}>
                <td className="perm-col-key">
                  <code className="perm-key">{perm.key}</code>
                  <span className="perm-desc">{perm.description}</span>
                </td>
                {ROLES.map((role) => {
                  const granted = perm.roles.includes(role.value);
                  const action = granted ? revokePermissionAction : grantPermissionAction;
                  return (
                    <td key={role.value} className="perm-col-role">
                      <form action={action}>
                        <input type="hidden" name="permissionId" value={perm.id} />
                        <input type="hidden" name="role" value={role.value} />
                        <button
                          type="submit"
                          className={`perm-toggle${granted ? ' perm-granted' : ' perm-denied'}`}
                          title={granted ? 'Revoke' : 'Grant'}
                          aria-label={`${granted ? 'Revoke' : 'Grant'} ${perm.key} for ${role.label}`}
                        >
                          {granted ? '✓' : '—'}
                        </button>
                      </form>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
