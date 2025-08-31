<?php

declare(strict_types=1);

namespace App\Areas\Admin\Controllers;

use App\Controllers\Controller;
use App\Entities\Admin;
use App\Repositories\AdminRepository;
use ManaPHP\Di\Attribute\Autowired;
use ManaPHP\Http\CaptchaInterface;
use ManaPHP\Http\Controller\Attribute\Authorize;
use ManaPHP\Http\ResponseInterface;
use ManaPHP\Http\Router\Attribute\PostMapping;
use ManaPHP\Http\Router\Attribute\RequestMapping;
use ManaPHP\Viewing\View\Attribute\ViewPostMapping;

#[Authorize(Authorize::GUEST)]
#[RequestMapping('/admin/account')]
class AccountController extends Controller
{
    #[Autowired] protected CaptchaInterface $captcha;
    #[Autowired] protected AdminRepository $adminRepository;

    #[PostMapping]
    public function captchaAction(): ResponseInterface
    {
        return $this->captcha->generate();
    }

    #[ViewPostMapping]
    public function registerAction(string $code, string $password): Admin
    {
        $this->captcha->verify($code);

        $admin = $this->adminRepository->fill($this->request->all());

        $admin->white_ip = '*';
        $admin->status = Admin::STATUS_INIT;
        $admin->password = $password;

        return $this->adminRepository->create($admin);
    }
}
