<?php

namespace App\Areas\Rbac\Controllers;

use App\Areas\Rbac\Models\Permission;
use App\Areas\Rbac\Models\Role;
use App\Areas\Rbac\Models\RolePermission;
use ManaPHP\Mvc\Controller;
use ManaPHP\Utility\Text;

/**
 * Class RbacPermissionController
 *
 * @package App\Controllers
 * @property-read \ManaPHP\AuthorizationInterface $authorization
 *
 */
class PermissionController extends Controller
{
    public function getAcl()
    {
        return ['list' => '@index', 'rebuild' => '@index', 'edit' => '@index', 'delete' => '@index'];
    }

    public function indexAction()
    {
        return $this->request->isAjax()
            ? Permission::all(['permission_id?' => input('permission_id', '')], ['with' => ['roles' => 'role_id, role_name, display_name'], 'order' => 'permission_id DESC'])
            : null;
    }

    public function listAction()
    {
        return $this->request->isAjax() ? Permission::all([], [], ['permission_id', 'path', 'display_name']) : null;
    }

    public function rebuildAction()
    {
        if ($this->request->isPost()) {
            $controllers = $this->aclBuilder->getControllers();
            $count = 0;
            foreach ($controllers as $controller) {
                /**@var \ManaPHP\Rest\Controller $controllerInstance */
                $controllerInstance = new $controller;
                $acl = $controllerInstance->getAcl();

                if (preg_match('#/Areas/([^/]*)/Controllers/(.*)Controller$#', str_replace('\\', '/', $controller), $match)) {
                    $area = $match[1];
                    $controller_name = $match[2];
                } else {
                    $area = null;
                    $controller_name = basename(str_replace('\\', '/', $controller), 'Controller');
                }

                foreach ($this->aclBuilder->getActions($controller) as $action) {
                    if (isset($acl[$action])) {
                        $roles = $acl[$action];
                        if ($roles[0] === '@' || in_array($acl[$action], ['*', 'guest', 'user', 'admin'], true)) {
                            continue;
                        }
                    } else {
                        if (isset($acl['*']) && in_array($acl['*'], ['*', 'guest', 'user', 'admin'], true)) {
                            continue;
                        }
                    }
                    $path = '/' . ($area ? Text::underscore($area) . '/' : '') . Text::underscore($controller_name) . '/' . Text::underscore($action);
                    $path = preg_replace('#(/index)+$#', '', $path) ?: '/';

                    if (Permission::exists(['path' => $path])) {
                        continue;
                    }

                    $permission = new Permission();
                    $permission->path = $path;
                    $permission->display_name = $path;
                    $permission->create();
                    $count++;
                }
            }

            foreach (Role::all() as $role) {
                $permission_ids = RolePermission::values('permission_id', ['role_id' => $role->role_id]);
                $permissions = Permission::values('path', ['permission_id' => $permission_ids]);

                $role_permissions = $this->authorization->buildAllowed($role->role_name, $permissions);
                $role->permissions = ',' . implode(',', $role_permissions) . ',';
                $role->update();
            }

            return ['code' => 0, 'message' => "新增 $count 条"];
        }
    }

    public function editAction()
    {
        return Permission::viewOrUpdate();
    }

    public function deleteAction()
    {
        if (!$this->request->isGet()) {
            $permission = Permission::get(input('permission_id'));
            foreach (Role::all(['role_id' => RolePermission::values('role_id', ['permission_id' => $permission->permission_id])]) as $role) {
                if (strpos($role->permissions, ",$permission->path,") !== false) {
                    $role->permissions = str_replace(",$permission->path,", ',', $role->permissions);
                    $role->update();
                }
            }

            RolePermission::deleteAll(['permission_id' => $permission->permission_id]);

            return $permission->delete();
        }
    }
}