<?php

declare(strict_types=1);

namespace App\Areas\Admin\Controllers;

use App\Controllers\Controller;
use App\Repositories\AdminRepository;
use Exception;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Di\Attribute\Config;
use ManaPHP\Http\CaptchaInterface;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\ResponseInterface;
use ManaPHP\Http\Router\Attribute\GetMapping;
use ManaPHP\Http\Router\Attribute\PostMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Http\RouterInterface;
use ManaPHP\Http\SessionInterface;
use ManaPHP\Mailing\MailerInterface;
use ManaPHP\Viewing\View\Attribute\ViewMapping;
use ManaPHP\Viewing\View\Attribute\ViewPostMapping;

#[Authorize(Authorize::GUEST)]
#[RequestMapping('/admin/password')]
class PasswordController extends Controller
{
    #[Autowired] protected CaptchaInterface $captcha;
    #[Autowired] protected MailerInterface $mailer;
    #[Autowired] protected AdminRepository $adminRepository;
    #[Autowired] protected RouterInterface $router;
    #[Autowired] protected SessionInterface $session;

    #[Config] protected string $app_name;

    #[GetMapping]
    public function captchaAction(): ResponseInterface
    {
        return $this->captcha->generate();
    }

    #[ViewMapping]
    public function forgetAction(): array
    {
        $vars = [];

        $vars['redirect'] = $this->request->input('redirect', $this->router->createUrl('/'));
        $vars['admin_name'] = $this->cookies->get('admin_name');

        return $vars;
    }

    #[PostMapping('forget')]
    public function doForgetAction(string $admin_name, string $email): ResponseInterface|string
    {
        $admin = $this->adminRepository->first(['admin_name' => $admin_name]);
        if (!$admin || $admin->email !== $email) {
            return '账号不存在或账号与邮箱不匹配';
        }

        $token = jwt_encode(['admin_name' => $admin_name], 600, 'admin.password.forget');

        $this->mailer->compose()
            ->setSubject($this->app_name . '-重置密码邮件')
            ->setTo($email)
            ->setHtmlBody(
                ['@app/Areas/Admin/Views/Mail/ResetPassword', 'email' => $email, 'admin_name' => $admin_name,
                 'token'                                              => $token]
            )
            ->send();
        return $this->response->json(['code' => 0, 'msg' => '重置密码连接已经发送到您的邮箱']);
    }

    #[ViewMapping]
    public function resetAction(): array
    {
        $token = $this->request->input('token');
        try {
            $claims = jwt_decode($token, 'admin.password.forget');
        } catch (Exception $exception) {
            return ['expired' => true, 'token' => $token];
        }

        return ['expired'    => false,
                'admin_name' => $claims['admin_name'],
                'token'      => $token,
        ];
    }

    #[PostMapping('reset')]
    public function doResetAction(string $token, string $password): string|ResponseInterface
    {
        try {
            $claims = jwt_decode($token, 'admin.password.forget');
        } catch (Exception $exception) {
            return '重置失败：Token已过期';
        }

        $admin_name = $claims['admin_name'];

        $admin = $this->adminRepository->firstOrFail(['admin_name' => $admin_name]);
        $admin->password = $password;
        $this->adminRepository->update($admin);

        return $this->response->json(['code' => 0, 'msg' => '重置密码成功']);
    }

    #[Authorize(Authorize::USER)]
    #[ViewPostMapping]
    public function changeAction(string $old_password, string $new_password, string $new_password_confirm): int|string
    {
        $admin = $this->adminRepository->get($this->identity->getId());
        if (!$admin->verifyPassword($old_password)) {
            return '旧密码不正确';
        }

        $admin->password = $new_password;
        if ($new_password_confirm !== $admin->password) {
            return '两次输入的密码不一致';
        }

        $this->adminRepository->update($admin);
        $this->session->destroy();

        return 0;
    }
}
