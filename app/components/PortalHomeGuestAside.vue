<template>
  <div class="home-guest-aside" aria-label="游客登录提示">
    <img
      class="home-guest-aside-illustration"
      src="/assets/images/home/home-guest-login-illustration.png"
      alt="还没有登录，登录之后职位任你挑选"
    >

    <NuxtLink to="/login" class="home-guest-aside-login">
      去登录
    </NuxtLink>
  </div>
</template>

<style scoped>
.home-guest-aside {
  display: flex;
  height: 100%;
  flex-direction: column;
  align-items: center;
  padding-top: 39px;
}

.home-guest-aside-illustration {
  display: block;
  width: 207px;
  height: 192px;
  object-fit: contain;
}

.home-guest-aside-login {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 108px;
  height: 32px;
  margin-top: 19px;
  border-radius: 999px;
  background: rgba(255, 165, 0, 1);
  color: rgba(255, 255, 255, 1);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Hiragino Sans GB', sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
  text-decoration: none;
}

.home-guest-aside-login:hover {
  background: rgba(240, 141, 0, 1);
}

@media (max-width: 1023px) {
  .home-guest-aside {
    min-height: 360px;
    padding-top: 44px;
  }
}
</style>
