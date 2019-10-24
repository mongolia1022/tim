<template>
  <div id="tim-demo-wrapper">
    <div class="demo">
      <el-row
        style="width:100%"
        v-loading="showLoading"
        element-loading-text="正在拼命初始化..."
        element-loading-background="rgba(0, 0, 0, 0.8)"
      >
        <el-col :span="8" style="height:100%" class="left" >
          <side-bar />
        </el-col>
        <el-col :span="16" style="height:100%" class="right">
          <current-conversation-box
            ref="currentConversationBox"
            class="current-conversation"
            v-if="showMessageSendBox"
          />
          <div v-else class="current-conversation-skeleton"></div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>
import { Notification } from 'element-ui'
import { mapState } from 'vuex'
import CurrentConversationBox from './components/conversation/current-conversation'
import SideBar from './components/layout/side-bar'
import { translateGroupSystemNotice,getUrlParamValue } from './utils/common'
import http from './utils/http'

export default {
  metaInfo: {
      title: 'My Example App', // set a title
      meta: [{                 // set meta
        name: 'viewport',
        content: 'width=device-width, initial-scale=1.0,minimum-scale=1.0,maximum-scale=1.0,user-scalable=no  '
      }]
    },
  components: {
    CurrentConversationBox,
    SideBar
  },
  data() {
    return {
      activeName: 'conversation'
    }
  },

  computed: {
    showMessageSendBox() {
      return this.$store.getters.currentConversationType !== ''
    },
    ...mapState({
      currentUserProfile: state => state.user.currentUserProfile,
      currentConversation: state => state.conversation.currentConversation,
      isLogin: state => state.user.isLogin,
      isSDKReady: state => state.user.isSDKReady
    }),
    showLoading() {
      return !this.isSDKReady
    }
  },

  mounted() {
    // 初始化监听器
    this.initListener()
      this.startConversation()
  },

    customerServer:0,

  methods: {
    startConversation() {
        const phone=getUrlParamValue('id')
        http.fetchGet(`/server/getCustomerServer?clientUser=${phone}`).then((r) => {
            window.console.log(r)
            this.customerServer=r.data
            this.login(phone)
        }).catch(err=>{
                this.$message.error('获取客服失败'+err)
            }
        )
    },
      login(user) {
          this.tim
              .login({
                  userID:user,
                  userSig: window.genTestUserSig(user).userSig
              })
              .then(() => {
                  this.$store.context.commit('toggleIsLogin', true)
                  this.$store.context.commit('startComputeCurrent')
              })
              .catch(imError => {
                  if (imError.code === 20000) {
                      window.$message.error(imError.message + ', 请检查是否正确填写了 SDKAPPID')
                  }
              })
      },
    initListener() {
      this.tim.on(this.TIM.EVENT.SDK_READY, this.onReadyStateUpdate, this)
      this.tim.on(this.TIM.EVENT.SDK_NOT_READY, this.onReadyStateUpdate, this)
      this.tim.on(this.TIM.EVENT.KICKED_OUT, () => {
        this.$message.error('被踢出，请重新登录。')
        this.$store.commit('toggleIsLogin', false)
        this.$store.commit('reset')
      })
      this.tim.on(this.TIM.EVENT.ERROR, this.onError)
      this.tim.on(this.TIM.EVENT.MESSAGE_RECEIVED, this.onReceiveMessage)
      this.tim.on(this.TIM.EVENT.CONVERSATION_LIST_UPDATED, event => {
        this.$store.commit('updateConversationList', event.data)
      })
      this.tim.on(this.TIM.EVENT.GROUP_LIST_UPDATED, event => {
        this.$store.commit('updateGroupList', event.data)
      })
    },
    onReceiveMessage({ data: messageList }) {
      this.handleAt(messageList)
      this.$store.commit('pushCurrentMessageList', messageList)
      this.$bus.$emit('scroll-bottom')
    },
    onError({ data: error }) {
      this.$message.error(error.message)
    },
    onReadyStateUpdate({ name }) {
        for(var i=0;i< this.customerServer.length;i++) {
            if (i == 0) {
                this.$store.dispatch('checkoutConversation', 'C2C'+this.customerServer[i].Tel)
            }else{
                this.tim.getConversationProfile('C2C'+this.customerServer[i].Tel)
            }
        }

        const isSDKReady = name === this.TIM.EVENT.SDK_READY ? true : false
      this.$store.commit('toggleIsSDKReady', isSDKReady)

      if (isSDKReady) {
        this.tim.getMyProfile().then(({ data }) => {
          this.$store.commit('updateCurrentUserProfile', data)
        })
        this.$store.dispatch('getBlacklist')
      }
    },
    /**
     * 处理 @ 我的消息
     * @param {Message[]} messageList
     */
    handleAt(messageList) {
      // 有@符号的文本消息
      const atTextMessageList = messageList.filter(
        message => message.type === this.TIM.TYPES.MSG_TEXT && message.payload.text.includes('@')
      )
      for (let i = 0; i < atTextMessageList.length; i++) {
        const message = atTextMessageList[i]
        const matched = message.payload.text.match(/@\w+/g)
        if (!matched) {
          continue
        }
        // @ 我的
        if (matched.includes(`@${this.currentUserProfile.userID}`)) {
          // 当前页面不可见时，通知一波。
          if (document.hidden) {
            this.notifyMe(message)
          }
          Notification({
            title: `有人在群${message.conversationID.slice(5)}提到了你`,
            message: message.payload.text,
            duration: 3000
          })
          this.$bus.$emit('new-messsage-at-me', {
            data: { conversationID: message.conversationID }
          })
        }
      }
    },
    /**
     * 使用 window.Notification 进行全局的系统通知
     * @param {Message} message
     */
    notifyMe(message) {
      if (!('Notification' in window)) {
        return
      } else if (window.Notification.permission === 'granted') {
        this.handleNotify(message)
      } else if (window.Notification.permission !== 'denied') {
        window.Notification.requestPermission().then(permission => {
          // 如果用户同意，就可以向他们发送通知
          if (permission === 'granted') {
            this.handleNotify(message)
          }
        })
      }
    },
    handleNotify(message) {
      const notification = new window.Notification('有人提到了你', {
        body: message.payload.text
      })
      notification.onclick = () => {
        window.focus()
        this.$store.dispatch('checkoutConversation', message.conversationID)
        notification.close()
      }
    }
  }
}
</script>

<style>
html,body{height:100%;}
body {
  margin: 0;
  background-color: #232329;
  color: #fcfcfc;
  padding: 1em;
  font-size: 1em;
}
#tim-demo-wrapper {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}
.demo {
  display: flex;
  min-width: 800px;
  max-width: 1000px;
  min-height: 600px;
  width: 60%;
  height: 60vh;
}

/* 文字超出显示省略号 */
.text-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.el-tabs__content {
  height: 100%;
}
.el-tabs__active-bar {
  background-color: #808080;
}
/* 当前会话的骨架屏 */
.current-conversation,
.current-conversation-skeleton {
  height: 100%;
  background-color: #eee;
  box-sizing: border-box;
  display: flex;
}
/* 当前会话 */
.current-conversation {
  color: #000;
  width: 100%;
}

/* 设置滚动条的样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
/* 滚动槽 */
::-webkit-scrollbar-track {
  border-radius: 10px;
}
/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.1);
}


/*样式修改*/
body {background-color: #ebeef5;}
#tim-demo-wrapper{padding-top:3vw;}
.demo{box-shadow:0px 0px 60px #c3dcf4;}
.bar-content[data-v-a2f73dfc]{background-color: #f8f8f8;}
.current-conversation,.current-conversation-skeleton{background:url(images/logo_gray2.jpg) center center no-repeat #fff; background-size:35%;}
.message-wrapper[data-v-73629db1]{margin: 12px 5px;}
.element-send[data-v-453b6846]{background: #f17c78;}
.element-send[data-v-453b6846] span{color:#fff;}
.bar-header[data-v-a2f73dfc]{ background:url(images/nav_bg2.jpg) bottom center no-repeat; background-size: 100% 100%; }
.el-badge{margin-bottom:0.8vw;}
.avatar{background:#7d211e;}
.iconfont[data-v-a2f73dfc]{color:#fff; filter:alpha(opacity=60);-moz-opacity: 0.6;opacity: 0.6;}
.iconfont[data-v-a2f73dfc]:hover{color:#fff;}
.iconfont[data-v-a2f73dfc].active{filter:alpha(opacity=100);-moz-opacity: 1;opacity: 1;}
.current-conversation-item{/*background-color: #f5f6f8;*/background-color: #f1f1f1;}
.bar-content[data-v-a2f73dfc]{overflow:hidden; box-shadow:5px 0px 10px #e6ebef;}
.userlist[data-v-577d9dbe]{position:relative;}
.userlist[data-v-577d9dbe]:after{content:''; width:80%; height:1px; line-height:1px; font-size:1px; overflow:hidden; border-bottom:1px solid #f2f2f2; position:absolute; bottom:0; right:0;}
#group-list{display:none;}
#black-list{display:none;}
.icon-custom{display:none;}
.icon-dice{display:none;}
.show-more{display:none;}
.more{display:none;}
.create-conversation{/*display:none;*/}
.el-popover-3378{width:300px;}
.emojis{width:395px;}
picker {display: inline-block}
.header{position: relative;}
.header .el-icon-back{position: relative; font-size: 1.2rem; position:absolute; left: 2vw; top: 50%; margin-top: -0.6rem; color: #888}
.el-button--primary{background: #a02925; border:1px solid #a02925;}
.el-button--primary:hover{background: #a02925; border:1px solid #a02925;}
.text-element-wrapper[data-v-453b6846]{border-radius: 100px;}
.text-element[data-v-453b6846]{padding: 6px 10px;}

/*去点击阴影*/
*{ -webkit-tap-highlight-color: rgba(0,0,0,0);-webkit-tap-highlight-color: transparent; /* For some Androids */ }

/*手机端*/
@media screen and (max-width: 1200px) {
    body,html{height:100%; overflow:hidden;}
    body {
        background-color:lightblue;
        padding:0;
        height:100%;
        overflow:hidden;
    }
    .header{width:100vw; overflow-y: scroll;}
    .header[data-v-72bead03]{background: #a02925; color: #fff; border-bottom: 1px solid #a02925;}
    .header .el-icon-back{color: #fff;}
    #tim-demo-wrapper{width:100vw; height:100%; padding-top:0; }
    .left{width:100vw; position:fixed; top:0; left:0; z-index:2002;}
    .el-badge{margin-bottom:3vw;}
    .demo{min-width: 100vw; max-width: 100vw;  min-height: 100vh;  max-height: 100vh;}
    .bar-header{padding:3vw;}
    .right{width:100vw; height:100%; overflow:hidden; position:fixed; top:0; left:0; z-index:2001;}
    .message-list{padding-left:0;}
    .message-list[data-v-72bead03]{width:100vw; padding:0;}
    #message-send-box-wrapper{width:100vw;}
    .btn-send{bottom:5vw; right:5vw;}
    .emojis{width:88vw;}
    /*.header{background: #0077ff; color: #fff;}*/
    .avatar {width: 40px; height: 40px; line-height: 40px;}
    .from{padding-left: 2vw;}
}

</style>

