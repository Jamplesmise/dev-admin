/**
 * 创建测试团队成员脚本
 * 在 root 用户所在的团队中创建多个测试成员
 *
 * 运行方式: npx ts-node scripts/create-test-members.ts
 */

import mongoose from 'mongoose';

const MONGODB_URI = 'mongodb://root:lxk6wcwr@dbconn.sealosbja.site:47460/fastgpt?authSource=admin&directConnection=true';

// 测试成员数据
const testMembers = [
  { username: '张三', email: 'zhangsan@test.com' },
  { username: '李四', email: 'lisi@test.com' },
  { username: '王五', email: 'wangwu@test.com' },
  { username: '赵六', email: 'zhaoliu@test.com' },
  { username: '陈七', email: 'chenqi@test.com' },
  { username: '周八', email: 'zhouba@test.com' },
  { username: '吴九', email: 'wujiu@test.com' },
  { username: '郑十', email: 'zhengshi@test.com' },
];

async function main() {
  try {
    console.log('正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('数据库连接成功');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('数据库连接失败');
    }

    // 1. 查找 root 用户
    const usersCollection = db.collection('users');
    const rootUser = await usersCollection.findOne({ username: 'root' });

    if (!rootUser) {
      console.log('未找到 root 用户，尝试查找其他用户...');
      const anyUser = await usersCollection.findOne({});
      console.log('找到用户:', anyUser);
      if (!anyUser) {
        throw new Error('数据库中没有用户');
      }
    } else {
      console.log('找到 root 用户:', rootUser._id, rootUser.username);
    }

    // 2. 查找 root 用户所在的团队
    const teamMembersCollection = db.collection('team_members');
    const rootTeamMember = await teamMembersCollection.findOne({
      userId: rootUser?._id
    });

    if (!rootTeamMember) {
      console.log('root 用户没有团队，列出所有团队成员...');
      const allMembers = await teamMembersCollection.find({}).limit(5).toArray();
      console.log('现有团队成员:', allMembers);
      throw new Error('找不到 root 用户的团队');
    }

    const teamId = rootTeamMember.teamId;
    console.log('找到团队 ID:', teamId);

    // 3. 查看团队信息
    const teamsCollection = db.collection('teams');
    const team = await teamsCollection.findOne({ _id: teamId });
    console.log('团队信息:', team);

    // 4. 创建测试用户和团队成员
    console.log('\n开始创建测试成员...\n');

    for (const member of testMembers) {
      // 检查用户是否已存在
      let user = await usersCollection.findOne({ email: member.email });

      if (!user) {
        // 创建新用户
        const userResult = await usersCollection.insertOne({
          username: member.username,
          email: member.email,
          avatar: '',
          status: 'active',
          createTime: new Date(),
          updateTime: new Date()
        });
        user = { _id: userResult.insertedId, username: member.username };
        console.log(`✅ 创建用户: ${member.username} (${user._id})`);
      } else {
        console.log(`⏭️  用户已存在: ${member.username} (${user._id})`);
      }

      // 检查是否已是团队成员
      const existingMember = await teamMembersCollection.findOne({
        teamId: teamId,
        userId: user._id
      });

      if (!existingMember) {
        // 添加为团队成员
        await teamMembersCollection.insertOne({
          teamId: teamId,
          userId: user._id,
          name: member.username,
          role: 'member',
          status: 'active',
          avatar: '',
          createTime: new Date(),
          updateTime: new Date()
        });
        console.log(`✅ 添加团队成员: ${member.username}`);
      } else {
        console.log(`⏭️  已是团队成员: ${member.username}`);
      }
    }

    // 5. 统计结果
    const totalMembers = await teamMembersCollection.countDocuments({ teamId: teamId });
    console.log(`\n✅ 完成！团队当前共有 ${totalMembers} 名成员`);

    // 列出所有成员
    const allTeamMembers = await teamMembersCollection.find({ teamId: teamId }).toArray();
    console.log('\n团队成员列表:');
    allTeamMembers.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.name} (${m.role}) - ${m.status}`);
    });

  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n数据库连接已关闭');
  }
}

main();
