<template>
  <div class="my-profile-wrapper">
    <el-dialog title="编辑个人资料" :visible.sync="showEditMyProfile">
      <el-form v-model="form" label-width="100px">
        <el-form-item label="头像">
          <el-input v-model="form.avatar" placeholder="头像地址(URL)" />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nick" placeholder="昵称" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio :label="TIM.TYPES.GENDER_MALE">男</el-radio>
            <el-radio :label="TIM.TYPES.GENDER_FEMALE">女</el-radio>
            <el-radio :label="TIM.TYPES.GENDER_UNKNOWN">不显示</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- <el-form-item label="生日">
          <el-date-picker v-model="form.birthday" placeholder="选择生日" />
        </el-form-item> -->
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="showEditMyProfile = false">取 消</el-button>
        <el-button type="primary" @click="editMyProfile">确 定</el-button>
      </span>
    </el-dialog>
    <el-popover :width="200" trigger="click" placement="right">
      <profile-card :profile="currentUserProfile" />
      <!--<el-button type="text" @click="handleEdit">编辑</el-button>-->
      <avatar shape="square" slot="reference" :src="currentUserProfile.avatar||'https://c-ssl.duitang.com/uploads/item/201704/27/20170427155254_Kctx8.thumb.700_0.jpeg'" text="U" class="my-avatar" />
    </el-popover>
  </div>
</template>

<script>
import { Popover, Form, FormItem, RadioGroup, Radio } from 'element-ui'
import { mapState } from 'vuex'
import ProfileCard from './profile-card'
export default {
  name: 'MyProfile',
  components: {
    ElPopover: Popover,
    ProfileCard,
    ElForm: Form,
    ElFormItem: FormItem,
    ElRadioGroup: RadioGroup,
    ElRadio: Radio
  },
  data() {
    return {
      showEditMyProfile: false,
      form: { avatar: '', nick: '', gender: '', birthday: '' }
    }
  },
  computed: {
    ...mapState({
      currentUserProfile: state => state.user.currentUserProfile,
      currentConversation: state => state.conversation.currentConversation
    }),
    gender() {
      switch (this.currentUserProfile.gender) {
        case this.TIM.TYPES.GENDER_MALE:
          return '男'
        case this.TIM.TYPES.GENDER_FEMALE:
          return '女'
        default:
          return '暂无'
      }
    }
  },
  methods: {
    editMyProfile() {
      const { avatar, nick, gender } = this.form
      this.tim
        .updateMyProfile({
          avatar,
          nick,
          gender
        })
        .then(() => {
          this.$message({ message: '修改成功', type: 'success' })
          this.showEditMyProfile = false
        })
    },
    handleEdit() {
      Object.assign(this.form, this.currentUserProfile)
      this.showEditMyProfile = true
    }
  }
}
</script>

<style scoped>
.my-avatar {
  cursor: pointer;
}
</style>
