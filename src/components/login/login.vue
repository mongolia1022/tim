<template>
  <div class="login-wrapper">
    <img :src="logo" width="50" height="50" style="border-radius: 5px;margin-bottom:12px;"/>
    <el-input placeholder="请输入用户ID" v-model="userID" />
    <br>
    <el-input type="password" placeholder="请输入密码" v-model="pwd" />
    <br>
    <el-button type="primary" @click="login" style="width:100%;">登录</el-button>
  </div>
</template>

<script>
import { Select, Option } from 'element-ui'
import logo from '../../assets/image/logo.png'
export default {
  name: 'Login',
  components: {
    ElSelect: Select,
    ElOption: Option
  },
  data() {
    return {
      userID: '',
      pwd:'',
      logo: logo
    }
  },
  methods: {
    login() {
      this.$store.dispatch('login', {userID:this.userID,pwd:this.pwd})
    }
  }
}
</script>

<style>
.login-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  padding: 24px;
  background: #fff;
  color: #000;
  border-radius: 5px;
}
</style>
