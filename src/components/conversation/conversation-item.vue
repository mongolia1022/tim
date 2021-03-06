<template>
  <popover
    placement="top"
    style="display: flex;flex-direction: column;padding:6px 12px"
    v-model="popoverVisible"
    trigger="manual"
    class="userlist"
  >
    <el-button class="context-menu-button" type="text" @click="deleteConversation">删除</el-button>
    <el-button class="context-menu-button" type="text" @click="popoverVisible = false ">取消</el-button>
    <div
      slot="reference"
      class="conversation-item-container"
      @contextmenu.prevent="popoverVisible = false"
      @click="selectConversation"
      ref="conersation_list"
      v-on:click="ChageStyle()"
    >
      <el-row :gutter="30">
        <el-col :span="4">
          <avatar shape="square" :src="avatar" :text="conversation.type" />
        </el-col>
        <el-col :span="20">
          <div class="conversation-item">
            <div class="item-header">
              <div
                class="covnersation-info text-ellipsis"
                v-if="typeof conversation.userProfile !== 'undefined'"
              >{{conversation.userProfile.nick+'('+conversation.userProfile.userID+')'}}</div>
              <div
                class="covnersation-info text-ellipsis"
                v-else-if="typeof conversation.groupProfile !== 'undefined'"
              >{{conversation.groupProfile.name || conversation.groupProfile.groupID}}</div>
              <div class="covnersation-info text-ellipsis" v-else>{{conversation.conversationID}}</div>
              <badge
                v-if="showUnreadCount"
                :max="99"
                :type="showGrayBadge?'info':'danger'"
                :value="conversation.unreadCount"
              />
            </div>
            <div class="conversation-message" v-if="conversation.lastMessage">
              <span class="message-for-show">
                <span style="color:red;" v-if="hasMessageAtMe">[有人提到我]</span>
                {{conversation.lastMessage.messageForShow}}
              </span>
              <span class="message-time">{{date}}</span>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </popover>
</template>

<script>
import { Button, Badge, Popover } from 'element-ui'
import Avatar from '../avatar.vue'
import { mapGetters, mapState } from 'vuex'
import { isToday, getDate, getTime } from '../../utils/date'
export default {
  name: 'conversation-item',
  props: ['conversation'],
  components: { Badge, Avatar, Popover, ElButton: Button },
  data() {
    return {
      popoverVisible: false,
      hasMessageAtMe: false
    }
  },
  computed: {
    showUnreadCount() {
      // 是否显示未读计数。当前会话和未读计数为0的会话，不显示。
      return (
        this.currentConversation.conversationID !==
          this.conversation.conversationID && this.conversation.unreadCount > 0
      )
    },
    date: function() {
      if (
        !this.conversation.lastMessage ||
        !this.conversation.lastMessage.lastTime
      ) {
        return ''
      }
      const date = new Date(this.conversation.lastMessage.lastTime * 1000)
      if (isToday(date)) {
        return getTime(date)
      }
      return getDate(date)
    },
    avatar: function() {
            return this.conversation.userProfile.avatar||'https://c-ssl.duitang.com/uploads/item/201704/27/20170427155254_Kctx8.thumb.700_0.jpeg'
      /*switch (this.conversation.type) {
        case 'GROUP':
          return this.conversation.groupProfile.avatar
        case 'C2C':
          return this.conversation.userProfile.avatar
        default:
          return 'https://c-ssl.duitang.com/uploads/item/201704/27/20170427155254_Kctx8.thumb.700_0.jpeg'
      }*/
    },
    showGrayBadge() {
      if (this.conversation.type !== this.TIM.TYPES.CONV_GROUP) {
        return false
      }
      return (
        this.conversation.groupProfile.selfInfo.messageRemindType ===
        'AcceptNotNotify'
      )
    },
    ...mapState({
      currentConversation: state => state.conversation.currentConversation
    }),
    ...mapGetters(['toAccount'])
  },
  mounted() {
    this.$bus.$on('new-messsage-at-me', event => {
      if (
        event.data.conversationID === this.conversation.conversationID &&
        this.conversation.conversationID !==
          this.currentConversation.conversationID
      ) {
        this.hasMessageAtMe = true
      }
    })
  },
  methods: {
    ChageStyle: function () {
      document.querySelector('.left').style.zIndex='2001'
    },
    selectConversation() {
        if (!this.conversation.conversationID) {
            this.tim.getConversationProfile('C2C'+this.conversation.userProfile.userID).then(({ data }) => {
                this.$store.dispatch(
                    'checkoutConversation',
                    data.conversation.conversationID
                )
            }).catch(e=>{
                window.console.log(e)
            })
            return
        }

      this.$store.dispatch(
        'checkoutConversation',
        this.conversation.conversationID
      )
    },
    deleteConversation() {
      this.tim
        .deleteConversation(this.conversation.conversationID)
        .then(() => {
          this.$message({
            message: `会话${this.conversation.conversationID}删除成功!`,
            type: 'success'
          })
          this.popoverVisible = false
          this.$store.commit('resetCurrentConversation')
        })
        .catch(error => {
          this.$message.error(
            `会话${this.conversation.conversationID}删除失败!, error=${error.message}`
          )
          this.popoverVisible = false
        })
    },
    showContextMenu() {
      this.popoverVisible = true
    },
    setMessageRead() {
      if (this.conversation.unreadCount === 0) {
        return
      }
      if (this.conversation.type === 'C2C') {
        this.tim.setMessageRead({
          conversationID: this.conversation.conversationID,
          lastMessageTime: this.conversation.lastMessage.lastTime
        })
      } else if (this.conversation.type === 'GROUP') {
        this.tim.setMessageRead({
          conversationID: this.conversation.conversationID,
          lastMessageSeq: this.conversation.lastMessage.lastSequence
        })
      }
    }
  },
  watch: {
    currentConversation(next) {
      if (next.conversationID === this.conversation.conversationID) {
        this.hasMessageAtMe = false
      }
    }
  }
}
</script>

<style scoped>
.conversation-item-container {
  margin: 6px 0;
}
.item-header {
  display: flex;
  justify-content: space-between;
}
.covnersation-info{
  max-width: 100%;
}

.conversation-message {
  display: flex;
  justify-content: space-between;
}
.message-for-show {
  color: gray;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-basis: 100px;
  flex-grow: 1;
}

.unread-count {
  background: #ff4949;
  color: #fff;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  text-align: center;
  box-shadow: 0 0.08533rem 0.17067rem 0 rgba(255, 73, 7);
}
.context-menu-button {
  width: 100%;
  margin-left: 0 !important;
}
.message-time {
  color: gray;
  font-size: 14px;
  white-space: nowrap;
}
</style>
