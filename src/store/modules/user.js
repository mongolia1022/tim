import tim from '../../tim'
const user = {
  state: {
    currentUserProfile: {},
    isLogin: false,
    isSDKReady: false, // TIM SDK 是否 ready
      currentPhone:''
  },
  mutations: {
    updateCurrentUserProfile(state, userProfile) {
      state.currentUserProfile = userProfile
    },
    toggleIsLogin(state, isLogin) {
      state.isLogin = typeof isLogin === 'undefined' ? !state.isLogin : isLogin
    },
    toggleIsSDKReady(state, isSDKReady) {
      state.isSDKReady = typeof isSDKReady === 'undefined' ? !state.isSDKReady : isSDKReady
    },
      updateCurrentPhone(state, currentPhone) {
          state.currentPhone = currentPhone
      },
    reset(state) {
      Object.assign(state, {
        currentUserProfile: {},
        isLogin: false,
        isSDKReady: false // TIM SDK 是否 ready
      })
    }
  },
  actions: {
    login(context, user) {
        if (user.pwd !== '123') {
            window.$message.error('密码错误')
            return
        }

      tim
        .login({
          userID:user.userID,
          userSig: window.genTestUserSig(user.userID).userSig
        })
        .then(() => {
            window.console.log(user)
            context.commit('updateCurrentPhone',user.userID)
          context.commit('toggleIsLogin', true)
          context.commit('startComputeCurrent')
        })
        .catch(imError => {
          if (imError.code === 20000) {
            window.$message.error(imError.message + ', 请检查是否正确填写了 SDKAPPID')
          }
        })
    },
    logout(context) {
      // 若有当前会话，在退出登录时已读上报
      if (context.rootState.conversation.currentConversation.conversationID) {
        tim.setMessageRead({ conversationID: context.rootState.conversation.currentConversation.conversationID })
      }
      tim.logout().then(() => {
        context.commit('toggleIsLogin')
        context.commit('stopComputeCurrent')
        context.commit('reset')
      })
    }
  }
}

export default user
